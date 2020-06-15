<h1 align="center">Welcome to WMRTC-Signalling-Server 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

> Powering RAMP platform - Stage - `prototype`

### 🏠 [Homepage](https://www.wellbeingtech.com/)

### ✨ [Demo](https://eyes.thewarriormonk.app/)

## Dev Env Install

```sh
git clone git@github.com:romansavchuk/ramp.git
cd ramp/WMRTC
npm install
node server.js
```

## Usage
http://localhost:3000

## Prod Deployment
##### 1. Precondition
Ubuntu 18.04 (Bionic Beaver)
AWS -T2-Medium (Min hardware requirement)

##### 2. Required Packages
```sh
sudo apt update
sudo apt upgrade
sudo apt-get install build-essential libcurl4-gnutls-dev libxml2-dev libssl-dev 
sudo apt-get install sqlite3 libsqlite3-dev libevent-dev libpq-dev 
sudo apt-get install mysql-client libmysqlclient-dev libhiredis-dev  
```

##### 3. Install NVM and Node.js

```sh
#install NVM follow guidelines from here
https://github.com/nvm-sh/nvm

#install node.js after nvm installation is complete
nvm install v10
```

##### 4. Coturn TURN and STUN server installation
```sh
sudo apt install coturn 
```
######4.1 Check the installation
```sh
which turnserver
```
######4.2 Coturn server config
```sh
#configuration file /usr/local/etc/turnserver.conf or /etc/turnserver.conf
# Wherever you find the file replace it with
https://github.com/romansavchuk/ramp/blob/master/WMRTC/coturn/turnserver.conf
```
###### 4.3 Securing Turnserver with TLS Certificate
```sh
#Add Certbot PPA
sudo apt-get update
sudo apt-get install software-properties-common
sudo add-apt-repository universe
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update

#Install Certbot 
sudo apt-get install certbot

#Running certbot standalone
sudo certbot certonly --standalone #follow the onscreen instructions
#For FQDN I have used eyes.thewarriormonk.app

#Once the certs are generated you will find certs at following location
/etc/letsencrypt/live/eyes.thewarriormonk.app/fullchain.pem
/etc/letsencrypt/live/eyes.thewarriormonk.app/privkey.pem

#Replace following keys in turnserver.conf file
cert=/etc/letsencrypt/live/eyes.thewarriormonk.app/fullchain.pem
pkey=/etc/letsencrypt/live/eyes.thewarriormonk.app/privkey.pem

#Setup Coturn start at system startup 
sudo vim /etc/default/coturn
TURNSERVER_ENABLED=1

#Restart Coturn Server
sudo service coturn restart
```

##### 5.  Install WMRTC Server 
```sh
#goto your installation dir
git clone git@github.com:romansavchuk/ramp.git
cd rmmp/WMRTC/

#Modify Signaling Server Details in public/dist/js/WMRTC-client.js
const iceServer = {
        "iceServers": [{
                "url": "stun:stun.l.google.com:19302"
            },
            {
                "url": "stun:eyes.thewarriormonk.app:3478?transport=udp"
            },
            {
                "url": "turn:eyes.thewarriormonk.app:3478?transport=udp",
                "username": "wellbeingtech",
                "credential": "nadnuk"
            },
            {
                "url": "turn:eyes.thewarriormonk.app:3478?transport=tcp",
                "username": "wellbeingtech",
                "credential": "nadnuk"
            }
        ]
    };

#install npm
npm install
```
###### 5.1 Install PM2
```sh
npm install pm2@latest -g
#Navigate to root source dir where server.js exists and run
pm2 start server.js

#Start WMRTC as service
pm2 startup
pm2 save

#Check logs if everything is running fine
pm2 logs

#Monitoring system
pm2 monit
```

##### 6. Nginx Installation
```sh
sudo apt-get install nginx
```

###### 6.1 Nginx SSL/TLS Setup
```sh
sudo vim /etc/nginx/nginx.conf
```
Replace Nginx conf file with below snippet.
```sh
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
	worker_connections 768;
	# multi_accept on;
}

http {

  ##
  # Basic Settings
  ##

  sendfile on;
  tcp_nopush on;
  tcp_nodelay on;
  keepalive_timeout 65;
  types_hash_max_size 2048;
  # server_tokens off;

  # server_names_hash_bucket_size 64;
  # server_name_in_redirect off;

  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  ##
  # SSL Settings
  ##

  ssl_protocols TLSv1 TLSv1.1 TLSv1.2; # Dropping SSLv3, ref: POODLE
  ssl_prefer_server_ciphers on;

  ##
  # Logging Settings
  ##

  access_log /var/log/nginx/access.log;
  error_log /var/log/nginx/error.log;
 
  include /etc/nginx/conf.d/*.conf;
  include /etc/nginx/sites-enabled/*;
  upstream web {
    server 0.0.0.0:3000;
  }

  upstream websocket {
          server 0.0.0.0:3000;
  }
  server {
                listen 443;
                server_name eyes.thewarriormonk.app;
                ssl on;
                ssl_certificate /etc/letsencrypt/live/eyes.thewarriormonk.app/fullchain.pem; # managed by Certbot
                ssl_certificate_key /etc/letsencrypt/live/eyes.thewarriormonk.app/privkey.pem;# managed by Certbot

                ssl_session_cache shared:SSL:1m;
                ssl_session_timeout 50m;
                ssl_protocols  TLSv1 TLSv1.1 TLSv1.2 SSLv2 SSLv3;
                ssl_ciphers HIGH:!aNULL:!MD5;
                ssl_prefer_server_ciphers on;
                location /wss {
                        proxy_pass http://websocket;
                        proxy_read_timeout 300s;
                        proxy_set_header Host $host;
                        proxy_set_header X-Real_IP $remote_addr;
                        proxy_set_header X-Forwarded-for $remote_addr;
                        proxy_set_header Upgrade $http_upgrade;
                        proxy_set_header Connection 'Upgrade';
                }
                location / {
                        proxy_pass http://web/;
                        proxy_set_header Host $host;
                        proxy_set_header X-Real-IP $remote_addr;
                        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                } 
  }

}
```
######6.2 Restart Nginx
```sh
sudo service nginx restart
```

The system will be live on `https://eyes.thewarriormonk.app`.

## Author

👤 **Roman Savchuk**
