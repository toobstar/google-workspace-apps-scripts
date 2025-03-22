/**
  Doing access & governance reviews on shared drives is surprisingly hard in Google Workspace
  
  This script will export all shared drives to the attached sheet as well as the users with access to each 
  and what role type they have. 

*/

// Tab names in attached google sheet
const sheetDrives = 'drives'
const sheetAccess = 'user-access'

const permListArgs = {
  useDomainAdminAccess: true,
  supportsAllDrives: true
}

function listDrives() {
  let sharedDrives = Drive.Drives.list({
    useDomainAdminAccess: true,
    hidden: false,
  })

  let sharedDrivesItems = sharedDrives.items
  while (sharedDrives.nextPageToken) {
    sharedDrives = Drive.Drives.list(
      {
        pageToken: sharedDrives.nextPageToken,
        useDomainAdminAccess: true,
        hidden: false,
      }
    )
    sharedDrivesItems = sharedDrivesItems.concat(sharedDrives.items)
  }

  let rows = sharedDrivesItems.map(v => [v.id, v.name])
  rows.unshift(['id','name'])

  let ss = SpreadsheetApp.getActive()
  let sheet = ss.getSheetByName(sheetDrives)
  sheet.clear()
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows)
}


function getPermissionsList(driveId, driveName) {
  let pList = Drive.Permissions.list(driveId, permListArgs)
  return pList.items.map(e => [driveName, e.emailAddress, e.role])
}

function getUsersForDrives() {
  let ss = SpreadsheetApp.getActive()
  let sheet = ss.getSheetByName(sheetDrives)
  let values = sheet.getDataRange().getValues()

  let rows = []
  for (i = 1; i < values.length; i++) {
    var driveId = values[i][0]
    var driveName = values[i][1]
    console.log(driveId, driveName)
    rows = rows.concat(getPermissionsList(driveId, driveName));
  }

  rows.unshift(['name','email', 'role'])

  let sheet2 = ss.getSheetByName(sheetAccess)
  sheet2.clear
  sheet2.getRange(sheet2.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

}

