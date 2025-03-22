const emails = ['person1@company.com', 'person2@company.com']
const companyDomain = 'company.com'

function clearSessions() {
  let pageToken, page, count = 0

  do {    
    page = AdminDirectory.Users.list({
      domain: companyDomain,
      orderBy: 'email',
      maxResults: 200,
      pageToken: pageToken,
      projection: 'full'
    })

    if (page.users) {
      page.users.forEach(user => {
        console.log(user.primaryEmail)
        if (emails.includes(user.primaryEmail)) {
          let userconnectedApps = AdminDirectory.Tokens.list(user.primaryEmail)
          if (userconnectedApps.items) {
            userconnectedApps.items.forEach(app => {
              console.log(user.primaryEmail, app.displayText)
              
              // https://developers.google.com/admin-sdk/directory/reference/rest/v1/tokens/delete
              AdminDirectory.Tokens.remove(user.primaryEmail, app.clientId);              
            })
          }
          
          // https://developers.google.com/admin-sdk/directory/reference/rest/v1/users/signOut
          AdminDirectory.Users.signOut(user.primaryEmail)
        }
      })
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
}
