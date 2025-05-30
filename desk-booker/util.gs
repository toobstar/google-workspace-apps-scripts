
function nextWorkingDate() {
  let tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  while (isWeekend(tomorrow)) {
    tomorrow.setDate(tomorrow.getDate() + 1)
  }  
  return tomorrow
}

function nextWorkingDate2() {
  let tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 2)
  while (isWeekend(tomorrow)) {
    tomorrow.setDate(tomorrow.getDate() + 1)
  }  
  return tomorrow
}

function hourMinute(d) {
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function pad(num) {
  return (num < 10 ? '0' : '') + num;
}

function isoVersion(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function deskPropKey(deskName) {
  return 'DESK---NAME---' + deskName
}

function roomPropKey(roomName) {
  return 'ROOM---NAME---' + roomName
}

function nameFromKey(key) {
  return key.split('---')[2]
}

function isDeskKey(key) {
  return key.includes('DESK---NAME')
}

function isRoomKey(key) {
  return key.includes('ROOM---NAME')
}

function isRoomBookingKey(key) {
  return key.includes('ROOM_BOOKING---')
}

function keyForDeskBooking(calId, date) {
  return 'DESK_BOOKING---' + calId + '---' + date
}

function keyForRoomBooking(calId, roomName, date, startTime) {
  return 'ROOM_BOOKING---' + calId + '---' + roomName + '---' + date + '---' + startTime
}

function componentsFromRoomBookingKey(key) {
  let components = key.split('---')
  let calId = components[1]
  let roomName = components[2]
  let date = components[3]
  let startTime = components[4]
  return {calId, roomName, date, startTime}
}

// function roomIdFromBookingKey(key) {
//   return key.split('---')[1]
// }

// function dateFromBookingKey(key) {
//   return key.split('---')[2]
// }

// function startTimeFromBookingKey(key) {
//   return key.split('---')[3]
// }

function nameFromEmail(e) {  
  let firstName = e.split('.')[0]
  return firstName
}

// Trim extra stuff out of:   "Sydney Hub-Ground Floor-Desk 01 (1)"
function cleanDeskName(deskName) {
  deskName = deskName.replace('(1)', '')
  deskName = deskName.replace('Sydney Hub-Ground Floor-', '')
  deskName = deskName.trim()
  return deskName
}

// Trim extra stuff out of:   Sydney Hub-Ground Floor-Qilin (2)
function cleanRoomName(roomName) {
  roomName = roomName.replace('Sydney Hub-Ground Floor-', '')
  roomName = roomName.split('(')[0]
  roomName = roomName.trim()
  return roomName
}

function isWeekend(yourDateObject) {
  let dayOfWeek = yourDateObject.getDay();
  let isWeekend = (dayOfWeek === 6) || (dayOfWeek  === 0); // 6 = Saturday, 0 = Sunday
  return isWeekend;
}

function plus30mins(t) {
  let components = t.split(':')
  let hours = parseInt(components[0])
  let minutes = parseInt(components[1])

  if (minutes == 30) {
    minutes = 0
    hours++
    if (hours >= 24) {
      hours = hours - 24
    }
  } else if (minutes == 0){
    minutes = '30'
  } else {
    console.error("unexpected time ", t) // should be either ??:00 or ??:30
  }
  return pad(hours) + ':' + pad(minutes)
}

function roundToPrevHalfHour(t) {
  let components = t.split(':')
  let hours = parseInt(components[0])
  hours = pad(hours)
  let minutes = parseInt(components[1])
  if (minutes >= 30) {
    minutes = 30
  } else {
    minutes = '00'
  }
  return hours + ':' + minutes
}

function roundToNextHalfHour(t) {
  let components = t.split(':')
  let hours = parseInt(components[0])
  let minutes = parseInt(components[1])
  if (minutes > 30) {
    hours = pad(hours + 1)
    minutes = '00'
  } else if (minutes < 1) {
    hours = pad(hours)
    minutes = '00'
  } else {
    hours = pad(hours)
    minutes = '30'
  }
  return hours + ':' + minutes
}

function isProfileKey(key) {
  return key.startsWith('PHOTO---')
}

function keyForPhoto(email) {
  return 'PHOTO---' +email
}

function emailFromPhotoKey(key) {
  return key.split('---')[1]
}

