

function doGet() {
  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
      .setTitle('Desk & Room Booker')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Build and return HTML in IFRAME sandbox mode.
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function initEvents(todaysCalendar) {
  console.log('initEvents', todaysCalendar)
  let calendar = CalendarApp.getDefaultCalendar()

  let date = new Date()
  if (!todaysCalendar) {
    date.setDate(date.getDate() + 1)
  }

  console.log('initEvents getEventsForDay-calendar')
  let events = calendar.getEventsForDay(date)

  let result = []

  for (const e of events) {    
    let startTime = hourMinute(e.getStartTime())
    let finishTime = hourMinute(e.getEndTime())    

    if (startTime != '00:00') { // all-day events
      let roomName = ''
      for (const gl of e.getGuestList()) {      
        let guestName = gl.getName()
        if (!guestName.includes('Desk') && gl.getEmail().includes('resource')) {
          roomName = cleanRoomName(guestName)
        }
      }

      let eventId = e.getId().split("@")[0];
      try {
        let meetLink = Calendar.Events.get(calendar.getId(), eventId).hangoutLink;

        result.push({
          start: startTime,
          finish: finishTime,
          date: isoVersion(e.getStartTime()),
          roomName: roomName,
          description: e.getTitle(),
          eventId: e.getId(),
          meetLink: meetLink
        })
      } catch (error) {
        console.log('issue getting meet link ', e.getDescription(), e.getStartTime(), calendar.getName(), roomName, eventId, error.message)
      }
    }
  }

  return result
}

function bookRoom(params) {
  console.log('bookRoom (server)', params)
  let roomName = params.roomName
  let startHourMins = params.startTime  
  let eventId = params.eventId
  let userEmail = Session.getEffectiveUser().getEmail()
  let date = params.date

  let propKey = roomPropKey(roomName)
  let dataStore = PropertiesService.getScriptProperties();
  let calendarId = dataStore.getProperty(propKey)

  let calForRoom = CalendarApp.getCalendarById(calendarId)
  if (!calForRoom) {
    console.log('bookRoom calendar not present so subscribing')
    calForRoom = CalendarApp.subscribeToCalendar(calendarId)
    console.log('bookRoom did subscribe work?', calendarId, (calForRoom != undefined))
  }

  let timeComponents = startHourMins.split(':')
  let hours = timeComponents[0]
  let minutes = timeComponents[1]

  let start = new Date()
  if (date) {
    start = new Date(date)
  }
  start.setHours(hours)
  start.setMinutes(0, 0, 0)
  start.setMinutes(minutes)

  let finish = new Date()
  finish.setTime(start.getTime() + (30 * 60 * 1000))

  let calendar = CalendarApp.getDefaultCalendar()
  let firstName = nameFromEmail(userEmail)

  let foundExisting = false

  if (eventId) {
    let events = calendar.getEvents(start, finish)
    for (const e of events) {    
      if (e.getId() == eventId) {
        
        let roomEvents = calForRoom.getEventsForDay(e.getStartTime())
        for (const roomEvent of roomEvents) {    
          console.log('checking overlap between ', roomEvent.getStartTime(), roomEvent.getEndTime(), e.getStartTime(), e.getEndTime())
          if (e.getStartTime() >= roomEvent.getStartTime() && e.getEndTime() <= roomEvent.getEndTime()) {
            console.log('bookRoom room busy '+ roomEvent.getTitle()) 
            return { success: false, reason: 'roomed booked for ' + roomEvent.getTitle() }
          }
        }

        console.log('adding room to existing booking', e.getTitle(), e.getDescription(), e.getCreators(), e.getStartTime())
        e.addGuest(calendarId)
        foundExisting = true 
      }
      // Could also do optional matching on start time if no explicit event passed in 
      // let startMatching = (hourMinute(start) == hourMinute(e.getStartTime()))
      // if (!foundExisting && !e.getTitle().includes('Desk') && startMatching) {
      //   console.log('adding room to existing booking', e.getTitle(), e.getDescription(), e.getCreators(), e.getStartTime())
      //   e.addGuest(calendarId)
      //   foundExisting = true 
      // }
    }
  }

  if (!foundExisting) {

    let roomEvents = calForRoom.getEventsForDay(start)
    for (const roomEvent of roomEvents) {    
      console.log('checking overlap between ', roomEvent.getStartTime(), roomEvent.getEndTime(), start, finish)
      if (start >= roomEvent.getStartTime() && finish <= roomEvent.getEndTime()) {
        console.log('bookRoom room busy ' + roomEvent.getTitle())
        return { success: false, reason: 'roomed booked for ' + roomEvent.getTitle() }
      }
    }

    calendar.createEvent('Room ' + roomName + ' for ' + firstName, start, finish, {guests: calendarId} );      
  }
  
  let todayISO = isoVersion(new Date())
  dataStore.setProperty(keyForRoomBooking(calendarId, roomName, todayISO, startHourMins), userEmail)

  params.booker = firstName
  params.startTime = startHourMins
  params.success = true
 
  return params
}

function testBookDesk() {
  bookDesk({ todaysCalendar: true, deskNumber: 'Desk 37' })
}

function bookDesk(params) {
  console.log('bookDesk (server)', params)
  let date
  if (params.todaysCalendar) {
    date = new Date()
  } else {
    date = nextWorkingDate(date)
  }

  let userEmail = Session.getEffectiveUser().getEmail()
  let deskName = params.deskNumber
  let propKey = deskPropKey(deskName)

  let dataStore = PropertiesService.getScriptProperties();
  let calId = dataStore.getProperty(propKey)

  let calendar = CalendarApp.getDefaultCalendar()
  let firstName = nameFromEmail(userEmail)

  let calForDesk = CalendarApp.getCalendarById(calId)
  console.log('bookDesk getEventsForDay-calForDesk', calId, (calendar != undefined))

  if (!calForDesk) {
    console.log('bookDesk calendar not present so subscribing')
    calForDesk = CalendarApp.subscribeToCalendar(calId)
    console.log('bookDesk did subscribe work?', calId, (calendar != undefined))
  }
  
  let deskEvents = calForDesk.getEventsForDay(date)
  let deskAvailable = (deskEvents.length == 0)  
  console.log('deskEvents count', deskAvailable, deskEvents.length)
  
  if (deskAvailable) {
    console.log('bookDesk', userEmail, firstName, deskName, calId, propKey)
    let event = calendar.createAllDayEvent(deskName + ' for ' + firstName, date, {guests: calId} )      
    let eventId = event.getId().slice(0,event.getId().length-11) // trim google.com
    Calendar.Events.patch({ transparency: "transparent"} ,calendar.getId(), eventId) // make it non-blocking event

    // update in data-store so others don't have to wait for next sync
    let dateISO = isoVersion(date)
    dataStore.setProperty(keyForDeskBooking(calId, dateISO), userEmail)    

    return { success: true, deskNumber: params.deskNumber, bookingName: userEmail, date: isoVersion(date) }
  } else {
    return { success: false, reason: 'desk is already booked ' + deskEvents[0].getTitle() }
  }

}



function getProfiles() {
  let dataStore = PropertiesService.getScriptProperties()
  let props = dataStore.getProperties()
  let result = {}
  for (var key in props) {
    if (isProfileKey(key)) {
      let email = emailFromPhotoKey(key)
      result[email] = props[key]
      console.log(email, props[key])
    }
  }
  return result
}

function reloadProfilePics() {
  let dataStore = PropertiesService.getScriptProperties()
  let props = dataStore.getProperties()

  for (var key in props) {
    if (isProfileKey(key)) {
      dataStore.deleteProperty(key)
    }
  }

  syncBookingsFromGoogleCalendars()
}

function syncBookings(todaysCalendar, userEmail) {
  console.log('syncDeskBookings (server) todaysCalendar', todaysCalendar, userEmail)

  let result = {}
  result.todaysDate = new Date().toLocaleDateString('en-us', { weekday:"short", month:"short", day:"numeric"}) 
  result.tomorrowsDate = nextWorkingDate().toLocaleDateString('en-us', { weekday:"short", month:"short", day:"numeric"}) 
  result.currentTime = roundToPrevHalfHour(hourMinute(new Date()))

  result.todaysDateIso = isoVersion(new Date())
  result.tomorrowsDateIso = isoVersion(nextWorkingDate())

  let statuses = fetchBookedStatuses()

  result.desks = statuses[0]
  result.rooms = statuses[1]

  result.deskInfo = fetchDeskInfo()

  result.scheduledEvents = initEvents(todaysCalendar)
  result.profiles = getProfiles()

  let dataStore = PropertiesService.getScriptProperties()
  let updateDate = dataStore.getProperty('REFRESH_TIME')
  result.updateDate = updateDate

  return result
}


function testError() {
  throw new Error('This a test error generated by the server')
}

// Necessary to support page reload
function getScriptURL() {
  return ScriptApp.getService().getUrl();
}


