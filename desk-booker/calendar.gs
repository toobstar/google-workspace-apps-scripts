const deskInfoProperty = 'DESK_INFO'
const deskInfoSpreadsheetId = "1R7vxk9Em????"

// https://developers.google.com/calendar/api/v3/reference/calendarList/list
function initCalendars() {
  let calendars;
  let pageToken;

  let dataStore = PropertiesService.getScriptProperties();
  dataStore.deleteAllProperties()

  do {
    calendars = Calendar.CalendarList.list({
      maxResults: 100,
      pageToken: pageToken
    });
    if (!calendars.items || calendars.items.length === 0) {
      console.log('No calendars found.');
      return;
    }
    
    for (const calendar of calendars.items) {
      console.log(calendar.summary)

      if (calendar.summary.includes('Sydney Hub')) {
        if (calendar.summary.includes('Desk')) {
          let deskName = cleanDeskName(calendar.summary)
          dataStore.setProperty(deskPropKey(deskName), calendar.id)
          // dataStore.setProperty(calendar.id, deskName)          
        } else {
          let roomName = cleanRoomName(calendar.summary)
          dataStore.setProperty(roomPropKey(roomName), calendar.id)
          // dataStore.setProperty(calendar.id, roomName)
        }
      }
    }
    pageToken = calendars.nextPageToken;
  } while (pageToken);

  console.log(dataStore.getProperties())
}

function goGeneralCleanUp() {
  console.log('general cleanup')
  // clean out previous bookings
  let dataStore = PropertiesService.getScriptProperties()  
  dataStore.getKeys().forEach(key => {
    if (!isDeskKey(key) && !isRoomKey(key) && !isProfileKey(key)) {
      //console.log("deleting key", key)
      dataStore.deleteProperty(key)
    }
  })
}

function syncBookingsFromGoogleCalendars() {
  let today = new Date()

  let tomorrow = nextWorkingDate()
  let afterTomorrow = nextWorkingDate2()
  let todayISO = isoVersion(today)
  let tomorrowISO = isoVersion(tomorrow)

  console.log('syncBookingsFromGoogleCalendars', todayISO, tomorrowISO)
  
  let dataStore = PropertiesService.getScriptProperties()  
  let emails = new Set();    

  dataStore.setProperty('REFRESH_TIME', today)
  reloadDeskInfo()

  dataStore.getKeys().forEach(key => {
    
    if (isDeskKey(key)) {
      let calId = dataStore.getProperty(key)
      let resourceName = nameFromKey(key)
      console.log('checking', key, calId, resourceName)      

      let bookedToday = ''
      let bookedTomorrow = ''

      let events = CalendarApp.getCalendarById(calId).getEvents(today, afterTomorrow)
      for (const e of events) {
        if (isoVersion(e.getStartTime()) == todayISO) {
          bookedToday = e.getCreators()[0]
        }
        if (isoVersion(e.getStartTime()) == tomorrowISO) {
          bookedTomorrow = e.getCreators()[0]
        }
        console.log('resourceName bookedToday-bookedTomorrow', bookedToday, bookedTomorrow)
      }

      dataStore.setProperty(keyForDeskBooking(calId, todayISO), bookedToday)
      dataStore.setProperty(keyForDeskBooking(calId, tomorrowISO), bookedTomorrow)
      emails.add(bookedToday)
      emails.add(bookedTomorrow)
    }

    else if (isRoomKey(key)) {
      let calId = dataStore.getProperty(key)
      let roomName = nameFromKey(key)
      console.log('checking', key, calId, roomName)

      let events = CalendarApp.getCalendarById(calId).getEventsForDay(today);
      console.log('event count', events.length)
      for (const e of events) {
        let person = e.getCreators().join(' ')
        if (person.includes('suspended')) { // in edge cases an ex-employee created the event which is still active.  Use guest list instead
          person = e.getGuestList(true).map(gl => gl.getEmail()).join(' ')
        }
        emails.add(person)
        
        let startTime = roundToPrevHalfHour(hourMinute(e.getStartTime()))
        let finishTime = roundToNextHalfHour(hourMinute(e.getEndTime()))

        console.log('booking', roomName, person, startTime, finishTime)
        dataStore.setProperty(keyForRoomBooking(calId, roomName, tomorrowISO, startTime), person)

        startTime = plus30mins(startTime)
        while (startTime < finishTime) {          
          console.log('booking for plus 30m', roomName, person, startTime, finishTime)
          dataStore.setProperty(keyForRoomBooking(calId, roomName, tomorrowISO, startTime), person)
          startTime = plus30mins(startTime)
        }
      }
    }
  })

  let currentKeys = dataStore.getKeys()
  Array.from(emails).forEach( e => {
    if (e) {
      let profileKey = keyForPhoto(e)
      if (!currentKeys.includes(profileKey)) {
        console.log("no profile yet for ", e)
        dataStore.setProperty(profileKey, fetchPhotoUrl(e))
      } else {
        console.log("profile photo already saved for ", e, dataStore.getProperty(profileKey))
      }
    }
  })

}

function reloadDeskInfo() {
  let range = "Sheet1!A2:B39"
  const result = Sheets.Spreadsheets.Values.get(deskInfoSpreadsheetId, range);

  let deskInfo = {}
  result.values.forEach(a => deskInfo[a[0]] = a[1])
  console.log(deskInfo)
 
  let dataStore = PropertiesService.getScriptProperties()
  dataStore.setProperty(deskInfoProperty, JSON.stringify(deskInfo))
}

function fetchDeskInfo() {
  let dataStore = PropertiesService.getScriptProperties()
  let raw = dataStore.getProperty(deskInfoProperty)
  let deskInfo = JSON.parse(raw)
  console.log('XXX fetchDeskInfo', deskInfo)
  return deskInfo
}

function reloadAllImages() {

  console.log('reloadAllImages')
  let dataStore = PropertiesService.getScriptProperties()

  let options = {
    readMask: 'emailAddresses',
    sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
    pageSize: 500
  }
  let result = People.People.listDirectoryPeople(options)  

  let emails = result.people.map(e => e.emailAddresses)
  emails = emails.map(e => e[0].value)

  emails.forEach(e => {
    Utilities.sleep(1000)
    let profileKey = keyForPhoto(e)
    let url = fetchPhotoUrl(e)
    dataStore.setProperty(profileKey, url)
    console.log('reloadAllImages', e, profileKey, url)
  })
  
}

function testPhotoEmployee() {
  // let rez = fetchPhotoUrl('chath.w@prospection.com')
  let rez = fetchPhotoUrl('toby.vidler@prospection.com')
  console.log(rez)
}

function fetchPhotoUrl(userEmail) {
  const options = {
    query: userEmail,
    readMask: "photos",
    sources: ["DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"]
  }
  const people = People.People.searchDirectoryPeople(options)
  if (Object.keys(people).length === 0) {
    console.log('no result for ', userEmail)
    return 'https://www.startupdaily.net/wp-content/uploads/2021/09/Prospection.jpg' // dummy image
  }

  console.log('fetchPhotoUrl', people)

  let photoUrl = people?.people[0]?.photos[0]?.url;
  console.log('fetchPhotoUrl', userEmail, photoUrl)

  return photoUrl
}

function fetchBookedStatuses() {
  let todayISO = isoVersion(new Date())
  let tomorrowISO = isoVersion(nextWorkingDate())
  console.log('fetchBookedStatusDesks', todayISO, tomorrowISO)

  let desks = {}
  let rooms = []

  let dataStore = PropertiesService.getScriptProperties()
  let props = dataStore.getProperties()
  for (var key in props) {
    
    if (isDeskKey(key)) {
      let calId = props[key]
      let resourceName = nameFromKey(key)
      //console.log('checking', key, calId, resourceName)
      let todayBooked = dataStore.getProperty(keyForDeskBooking(calId, todayISO))
      let tomorrowBooked = dataStore.getProperty(keyForDeskBooking(calId, tomorrowISO))

      desks[resourceName] = {}
      desks[resourceName][todayISO] = (todayBooked ? todayBooked : '')
      desks[resourceName][tomorrowISO] = (tomorrowBooked ? tomorrowBooked : '')
    }

    if (isRoomBookingKey(key)) {
      let bookerEmail = props[key]
      let components = componentsFromRoomBookingKey(key)
      let calId = components.calId
      let date = components.date
      let startTime = components.startTime
      let roomName = components.roomName
      console.log('room booking', bookerEmail, components, key)
      rooms.push([roomName, date, startTime, bookerEmail])      
    }

  }

  console.log(desks)
  console.log(rooms)

  return [desks, rooms]
}

function reportOnDesks() {
  let today = new Date()
  let start = new Date(today.getFullYear(), 0, 1)

  let todayISO = isoVersion(today)
  let startISO = isoVersion(start)
  console.log('reportOnDesks', todayISO, startISO)
  
  let dataStore = PropertiesService.getScriptProperties();
  
  dataStore.getKeys().forEach((key, idx) => {
    
    if (isDeskKey(key)) {
      let calId = dataStore.getProperty(key)
      let resourceName = nameFromKey(key)
      //console.log('checking', key, calId, resourceName)

      let events = CalendarApp.getCalendarById(calId).getEvents(start, today);  
      for (const e of events) {
        let person = e.getCreators()[0]
        let startEvent = isoVersion(e.getStartTime())
        console.log(resourceName + ',' + person + ',' + startEvent)
      }


    }


  })

  

}
