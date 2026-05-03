# Project Root Configuration Files

## docker-compose.yml Example
# See DEPLOYMENT_GUIDE.md for full Docker setup

## nginx.conf Example (for on-premise deployment)
```
server {
    listen 80;
    server_name api.attendance.university.edu;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Ecosystem file for PM2 (pm2 ecosystem.json)
```json
{
  "apps": [{
    "name": "attendance-api",
    "script": "./src/server.js",
    "cwd": "./backend",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production"
    },
    "error_file": "./logs/err.log",
    "out_file": "./logs/out.log"
  }]
}
```

See DEPLOYMENT_GUIDE.md for complete configuration examples.
