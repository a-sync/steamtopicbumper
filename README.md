# Steam topic bumper

## Requirements
 * sane install of node 8 or newer
 * steam user account
    * non [limited](https://support.steampowered.com/kb_article.php?ref=3330-IAGK-7663)
    * has a custom URL setup
    * has an email that can forward messages
 * browserless.io token

## Config
Configuration is done via the following environmental variables.

##### LOGIN_URL
The login url including the redirection parameters for the discussion topic.  
Example: 
`https://steamcommunity.com/login/home/?goto=app%2F107410%2Fdiscussions%2F10%2F1634166237664079458%2F`
##### LOGIN
The login name of the steam user.
##### PASSW
The password of the steam user.
##### IDURL
The custom URL of the steam user.  
Example: `https://steamcommunity.com/id/bumperbot`
##### RESTMAIL
The inbox name of the restmail.net email used to receive the forwarded steam guard email.  
Example: `bumperbot`  
Matching gmail filter:
```
Matches: from:(noreply@steampowered.com) subject:(Your Steam account: Access from new web or mobile device)
Do this: Forward to bumperbot@restmail.net
```
##### TOKEN
The browserless.io API token.