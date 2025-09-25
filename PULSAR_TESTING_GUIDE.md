# Pulsar Real-time Testing Guide

## 🎯 **How to Test Real-time Pulsar Updates**

Now that we have the dashboard integration complete, here's how to test that the Pulsar real-time updates are working:

## 📱 **Step 1: Access the Dashboard**

1. Go to your dashboard: `https://poolheating.vercel.app/dashboard`
2. Look for the **"Real-time Updates (Pulsar)"** card
3. You should see the connection status and controls

## 🔌 **Step 2: Start the Pulsar Connection**

1. Click the **"Start Real-time"** button
2. Wait for the connection to establish
3. You should see:
   - ✅ **Connection Status**: "Connected" (green badge)
   - 📊 **Messages Received**: 0 (initially)
   - ⏰ **Last Message**: "Never" (initially)
   - 🔄 **Auto-refreshing**: Every 5 seconds (green indicator)

## 🧪 **Step 3: Test Real-time Updates**

### **Method 1: Change Heat Pump Settings**
1. **Change Temperature**: 
   - Go to your heat pump app or physical controls
   - Change the target temperature (e.g., from 28°C to 30°C)
   - **Watch the dashboard** - you should see the message count increase

2. **Toggle Power**:
   - Turn the heat pump on/off
   - **Watch the dashboard** - you should see another message

3. **Adjust Fan Speed**:
   - Change the fan speed setting
   - **Watch the dashboard** - you should see another message

### **Method 2: Use the Dashboard Controls**
1. **Change Target Temperature**:
   - Use the temperature slider in the "Heat Pump Control" section
   - Click "Apply Water Temperature"
   - **Watch the Pulsar card** - message count should increase

2. **Toggle Power**:
   - Use the power switch in the "Heat Pump Control" section
   - **Watch the Pulsar card** - message count should increase

## 📊 **What You Should See**

### **When Working Correctly:**
- ✅ **Connection Status**: "Connected" (green)
- 📈 **Messages Received**: Increases with each change
- ⏰ **Last Message**: Shows recent timestamp (e.g., "14:32:15")
- 🔄 **Auto-refreshing**: Green pulsing indicator
- 📝 **Console Logs**: Messages in browser console

### **Example Success Flow:**
```
1. Start Real-time → Connection Status: "Connected"
2. Change temperature → Messages Received: 1, Last Message: "14:32:15"
3. Toggle power → Messages Received: 2, Last Message: "14:32:18"
4. Change fan speed → Messages Received: 3, Last Message: "14:32:21"
```

## 🔍 **Troubleshooting**

### **If Connection Fails:**
- ❌ **Connection Status**: "Disconnected" (red)
- 🔴 **Error Message**: Shows in red box
- **Solutions**:
  1. Check your internet connection
  2. Try clicking "Start Real-time" again
  3. Check browser console for errors

### **If No Messages Received:**
- ✅ **Connection Status**: "Connected"
- 📊 **Messages Received**: Stays at 0
- **Solutions**:
  1. Make sure your heat pump is online
  2. Try changing settings on the heat pump
  3. Check if the device is sending data to Tuya

### **If Messages Don't Update Dashboard:**
- 📊 **Messages Received**: Increases
- 🖥️ **Dashboard**: Doesn't reflect changes
- **Solutions**:
  1. Check if the heat pump status section updates
  2. Try refreshing the page
  3. Check browser console for errors

## 🎯 **Expected Behavior**

### **Real-time Updates:**
- **Instant**: Messages should appear within seconds of device changes
- **Automatic**: No need to refresh the page
- **Persistent**: Connection stays active until stopped

### **Data Storage:**
- **Database**: All messages are stored in Supabase
- **History**: Previous values are kept for analysis
- **Current**: Latest values are always available

## 📱 **Mobile Testing**

1. **Open on Mobile**: Access the dashboard on your phone
2. **Start Connection**: Tap "Start Real-time"
3. **Change Settings**: Use your heat pump app to change settings
4. **Watch Updates**: See real-time updates on your phone

## 🔧 **Advanced Testing**

### **Multiple Changes:**
1. Make several rapid changes to the heat pump
2. Watch the message count increase for each change
3. Verify the "Last Message" timestamp updates

### **Connection Stability:**
1. Start the connection
2. Leave it running for 10+ minutes
3. Make occasional changes
4. Verify it stays connected and responsive

## 🎉 **Success Indicators**

You'll know it's working when:
- ✅ **Connection establishes** successfully
- 📈 **Message count increases** with each device change
- ⏰ **Timestamps update** in real-time
- 🔄 **Auto-refresh works** smoothly
- 📱 **Dashboard updates** reflect device changes

## 🚨 **If Something's Wrong**

1. **Check Console**: Open browser dev tools (F12) and look for errors
2. **Try Restarting**: Click "Stop Real-time" then "Start Real-time"
3. **Check Network**: Ensure stable internet connection
4. **Verify Device**: Make sure your heat pump is online and sending data

## 📞 **Need Help?**

If you encounter issues:
1. Check the browser console for error messages
2. Try the troubleshooting steps above
3. Verify your heat pump is connected to Tuya
4. Make sure you're using the correct device ID and credentials

---

**🎯 The goal is to see real-time updates on your dashboard whenever you change your heat pump settings!**
