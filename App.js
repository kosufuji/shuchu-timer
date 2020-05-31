import React from 'react';
import { StyleSheet, View, Text,Switch,AsyncStorage, ScrollView,BackHandler  } from 'react-native';
import { ButtonGroup,Icon,Input,Button } from 'react-native-elements'
import Modal from 'react-native-modal'

import * as Progress from 'react-native-progress';

export default class App extends React.Component {
  
  state = {
      isModalVisible: false,
      penalty: false,
      startCount: false,
      timerStr: "00:00",
      timerLossStr: "00:00",
      reward:0,
      unit:"円",
      rewardAmount:"1000",
      rewardInterval: "1",
      timerStarted:false,
      loading:true,
      progress:0
  }

  startPoseIcon = () => <View>{ this.state.startCount ?
                  <Icon name='pause' color='#FF7043' size={50}/>:
                  <Icon name='play-arrow' color='#FF7043' size={50}/> }</View>
  resetIcon = () => <Icon name='replay' color='#FF7043' size={32}/>
  settingsIcon = () => <Icon name='tune' color='#FF7043' size={32}/>
  pauseIcon =  () => <Icon name='pause' color='#FF7043' size={40}/>
  buttons = [{element:this.resetIcon},{element:this.startPoseIcon},{element:this.settingsIcon}]
  timerInterval=null;
  timeStampLast=0
  timeStampNow=0;
  timeWorked=0;
  timeLoss=0;

  async componentDidMount(){
    console.log("mounted")

    let promisies = []

    promisies.push(this.getData("penalty",(penalty)=>{
      if (penalty=="true") this.setState({penalty:true})
    }))

    promisies.push(this.getData("unit",(unit)=>{
      if (unit!=null) this.setState({unit:unit})
    }))
    
    promisies.push(this.getData("rewardAmount",(amount)=>{
      if (amount!=null) this.setState({rewardAmount:amount})
    }))
    promisies.push(this.getData("rewardInterval",(interval)=>{
      if (interval!=null) this.setState({rewardInterval:interval})
    }))
    promisies.push(this.getData("timeWorked",(timeWorked)=>{
      if (timeWorked!=null){
        let timeWorkedNum = parseInt(timeWorked,10)
        if (!isNaN(timeWorkedNum)){
          this.timeWorked = timeWorkedNum
          let timeString = this.numberToTime(this.timeWorked)
          this.setState({timerStr:timeString})
          if (!this.state.penalty){
            this.updateReward(this.timeWorked)
            this.updateProgress(this.timeWorked)
          }
        }
      }
    }))
    promisies.push(this.getData("timeLoss",(timeLoss)=>{
      if (timeLoss!=null){
        let timeLossNum = parseInt(timeLoss,10)
        if (!isNaN(timeLossNum)){
          this.timeLoss = timeLossNum
          let timeString = this.numberToTime(this.timeLoss)
          this.setState({timerLossStr:timeString})
          if (this.state.penalty){
            this.updateReward(this.timeLoss)
            this.updateProgress(this.timeLoss)
          }
        }
      }
    }))

    let startCount = await this.getData("startCount")
    if (startCount=="true") this.setState({startCount:true})
    let timerStarted = await this.getData("timerStarted")
    if (timerStarted=="true") this.setState({timerStarted:true})
    let timeStampLast = await this.getData("timeStampLast")
    if (timeStampLast!=null){
      let timeStampLastNum = parseInt(timeStampLast,10)
      if (!isNaN(timeStampLastNum)){
        this.timeStampLast = timeStampLastNum
      }
    }
    if (timerStarted=="true"){
      this.timerUpdate()
      this.startTimer(this.timeStampLast)
      this.setState({timerStarted:true})
      this.storeData("timeStarted","true")
    }

    await Promise.all(promisies)
    this.setState({loading:false})

  }

  componentWillUnmount(){
    if (this.timerInterval!=null){
      clearInterval(this.timerInterval)
      this.timerInterval=null
    }
  }

  startTimer = (timeStampLast=null)=>{
    let date = new Date();
    if(timeStampLast==null){
      this.timeStampLast = Math.floor(date.getTime()/1000);
    } else {
      this.timeStampLast = timeStampLast
    }
    this.storeData("timeStampLast",this.timeStampLast.toString())
    if (this.timerInterval==null){
      this.timerInterval = setInterval(this.timerUpdate,1000)
    }
  }

  storeData = async (key,value) => {
    try{
      await AsyncStorage.setItem(key,value);
    }catch(error){
      console.log(error);
    }
  }

  getData = async (key,callback=null) => {
    try{
      const value = await AsyncStorage.getItem(key);
      if (callback!=null){
        callback(value)
      }
      return value
    }catch(error){
      console.log(error);
      return null
    }
  }

  toggleModal = () => {
    if (!this.state.isModalVisible && this.timerInterval!=null){
      clearInterval(this.timerInterval)
      this.timerInterval = null
    } else if(this.timerInterval==null&&this.state.timerStarted){
      if (this.state.penalty){
        this.updateReward(this.timeLoss)
        this.updateProgress(this.timeLoss)
      } else {
        this.updateReward(this.timeWorked)
        this.updateProgress(this.timeWorked)
      }
      this.timerUpdate()
      this.timerInterval = setInterval(this.timerUpdate,1000)
    }
    this.setState({ isModalVisible: !this.state.isModalVisible });
  }

  toggleSwitch = () => {
    this.storeData("penalty",(!this.state.penalty).toString())
    this.setState({ penalty: !this.state.penalty})
  }

  changeUnit = (unit) => {
    this.storeData("unit",unit)
    this.setState({unit:unit})
  }

  changeRewardAmount = (amount) => {
    if (!isNaN(amount)){
      this.storeData("rewardAmount",amount)
      this.setState({rewardAmount:amount})
    } else {
      this.storeData("rewardAmount","")
      this.setState({rewardAmount:""})
    }
  }

  changeRewardInterval = (interval) => {
    if (!isNaN(interval)&&interval!=0){
      this.storeData("rewardInterval",interval)
      this.setState({rewardInterval:interval})
    } else {
      this.storeData("rewardInterval","")
      this.setState({rewardInterval:""})
    }
  }

  numberToTime = (number) => {
    if (!isNaN(number)){
      let sec = number % 60
      let min = Math.floor(number/60)%60
      let hour = Math.floor(number/60/60)
      let secStr = ""
      let minStr = ""
      let hourStr = ""
      if (sec<10){
        secStr += "0"
      }
      secStr += sec
      if (min<10){
        minStr += "0"
      }
      minStr += min
      if (hour>0){
        hourStr += hour + ":"
      }
      return hourStr + minStr + ":" + secStr
    } else{
      return '00:00'
    }
  }

  updateProgress = (time)=>{
    let interval = parseFloat(this.state.rewardInterval)
    if (!isNaN(interval)&&interval!=0){
      let progressSec = time % (interval*60)
      let progress = progressSec / (interval*60)
      if (this.state.progress > progress){
        this.setState({progress:1.0},()=>{
          setTimeout(()=>{
            this.setState({progress:progress})
          },200)
        })
      } else {
        this.setState({progress:progress})
      }
    } else {
      this.setState({progress:0})
    }

  }

  timerUpdate = ()=>{
    let date = new Date();
    this.timeStampNow = Math.floor(date.getTime()/1000);
    let timeDif = this.timeStampNow - this.timeStampLast
    if (this.state.startCount){
      this.timeWorked += timeDif
      this.storeData("timeWorked",this.timeWorked.toString())
      let timeString = this.numberToTime(this.timeWorked)
      this.setState({timerStr:timeString})
      if (!this.state.penalty){
        this.updateProgress(this.timeWorked)
        this.updateReward(this.timeWorked)
      }
    } else {
      this.timeLoss += timeDif
      this.storeData("timeLoss",this.timeLoss.toString())
      let timeString = this.numberToTime(this.timeLoss)
      this.setState({timerLossStr:timeString})
      if (this.state.penalty){
        this.updateReward(this.timeLoss)
        this.updateProgress(this.timeLoss)
      }
    }
    this.timeStampLast = this.timeStampNow
    this.storeData("timeStampLast",this.timeStampLast.toString())
  }

  updateReward = (timeNumber) =>{
    let interval = parseFloat(this.state.rewardInterval)
    let amount = parseFloat(this.state.rewardAmount)
    if (interval!=0){
      let reward = Math.floor(timeNumber/(interval*60)) * amount
      this.setState({reward:reward})
    } else {
      this.setState({reward:0})
    }
  }

  onClickButton = (index) => {
    if (index==1){
      clearInterval(this.timerInterval)
      this.timerInterval = null
      this.setState({timerStarted:true})
      this.storeData("timerStarted","true")
      this.storeData("startCount",(!this.state.startCount).toString())
      this.setState({startCount: !this.state.startCount},()=>{
        let date = new Date();
        this.timeStampLast = Math.floor(date.getTime()/1000);
        this.storeData("timeStampLast",this.timeStampLast.toString())
        if (this.timerInterval==null){
          this.timerInterval = setInterval(this.timerUpdate,1000)
        }

      })
    }
    if (index==0){
      if (this.timerInterval!=null){
        clearInterval(this.timerInterval)
        this.timerInterval = null
      }
      this.timeStampStarted=0;
      this.timeStampStoped=0;
      this.timeStampNow=0;
      this.timeWorked=0;
      this.storeData("timeWorked","0")
      this.timeLoss=0;
      this.storeData("timeLoss","0")
      this.storeData("timerStarted","false")
      this.storeData("startCount","false")
      this.setState({timerStarted:false,startCount:false,timerStr: "00:00",timerLossStr:"00:00", reward:0, progress:0})
    }
    if (index==2){
      this.toggleModal()
    }
    console.log(index)
  }

  render(){
    return (
      <View style={styles.container}>
          <Icon size={80} name="alarm" color="#fff"/>
          <View style={styles.timeContainer}>
            <Text style={styles.timerText}>{this.state.timerStr}</Text>
            <Progress.Bar style={{marginBottom:20}} progress={this.state.progress} color={'#fff'} width={300} height={10}/>
            <Text style={styles.rewardTextTitle}>失った時間</Text>
            <Text style={styles.rewardText}>{this.state.timerLossStr}</Text>
            <Text style={styles.rewardTextTitle}>{this.state.penalty?"ペナルティ": "獲得報酬"}</Text>
            <Text style={styles.rewardText}>{this.state.reward}{this.state.unit}</Text>
          </View>
          <ButtonGroup
              onPress={this.onClickButton}
              buttons={this.buttons}
              containerStyle={styles.buttonsContainer}
            />
            <Modal style={styles.modal} isVisible={this.state.isModalVisible}>
              <ScrollView contentContainerStyle={styles.modalContainer}>
                <Text style={styles.modalTitle}>設定</Text>
                <Input onChangeText={this.changeUnit} value={this.state.unit} label={
                  <View>
                    <Text style={styles.settingsTitle}>報酬/ペナルティの単位</Text>
                    <Text style={styles.settingsDescription}>報酬またはペナルティの単位を設定します</Text>
                  </View>
                } maxLength={7}/>
                <Input onChangeText={this.changeRewardAmount} value={this.state.rewardAmount} keyboardType="numeric" label={
                  <View>
                    <Text style={styles.settingsTitle}>1回の報酬/ペナルティ量</Text>
                    <Text style={styles.settingsDescription}>1度に与えられる報酬またはペナルティの量を設定します</Text>
                  </View>} maxLength={7}/>
                <Input onChangeText={this.changeRewardInterval} value={this.state.rewardInterval} keyboardType="numeric" label={
                  <View>
                    <Text style={styles.settingsTitle}>報酬/ペナルティ獲得間隔</Text>
                    <Text style={styles.settingsDescription}>報酬またはペナルティが与えられる間隔を設定します</Text>
                  </View>
                } rightIcon={()=><Text style={{fontSize:18}}>分</Text>} maxLength={7}/>
                <Input label={ 
                  <View>
                    <Text style={styles.settingsTitle}>ペナルティモード</Text>
                    <Text style={styles.settingsDescription}>ペナルティモードは一定間隔で罰金などのペナルティを課すモードです</Text>
                  </View>
                } 
                  InputComponent={()=>
                  <Switch style={{paddingVertical:10}} onValueChange={this.toggleSwitch} value={this.state.penalty}></Switch>
                } inputContainerStyle={{borderWidth:1,borderColor:'white'}}/>
                <Button
                    title="完了"
                    buttonStyle={styles.settingsCloseButton}
                    containerStyle={styles.settingsCloseButtonContainer}
                    onPress={this.toggleModal}
                />
              </ScrollView>
            </Modal>
            <View style={this.state.loading?styles.titleCover:styles.titleCoverClose}></View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  titleCover:{
    position:"absolute",
    top:0,
    left:0,
    width:"100%",
    height:"100%",
    backgroundColor: '#80DEEA'
  },
  titleCoverClose:{
    display:'none'
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent:'space-between',
    flexDirection:'column',
    backgroundColor: '#80DEEA',
    paddingVertical:50
  },
  titleText: {
    fontSize: 50,
    color: '#FF7043',
    fontWeight: 'bold'
  },
  timeContainer:{
    alignItems:'center'
  },
  timerText: {
    fontSize: 80,
    color: '#FFF',
    fontWeight: 'bold',
    lineHeight: 125
  },
  rewardTextTitle: {
    fontSize: 24,
    color: '#929292',
    fontWeight: 'bold',
    lineHeight: 37,
    alignItems:'center'
  },
  rewardText: {
    fontSize: 38,
    color: '#929292',
    fontWeight: 'bold',
    lineHeight: 40,
    textAlign:'center',
    marginTop:5
  },
  buttonsContainer:{
    height:50
  },
  modalContainer:{
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: "#fff",
    paddingHorizontal:20,
    paddingBottom:20
  },
  modal:{
    height:"100%"
  },
  modalTitle:{
    fontSize:24,
    marginVertical:30,
    color:'#FF7043',
    fontWeight:'bold'
  },
  settingsTitle:{
    fontSize:16,
    color:"#FF7043",
    fontWeight:'bold'
  },
  settingsDescription:{
    color:"#929292"
  },
  settingsCloseButton:{
    width:"100%",
    backgroundColor:'#FF7043',
  },
  settingsCloseButtonContainer:{
    width:"100%"
  }
});
