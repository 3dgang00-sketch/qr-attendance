# Deployment Guide

## Overview

This guide covers deploying the Attendance Management System to production environments.

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrated and verified
- [ ] SSL certificates obtained
- [ ] Admin account created
- [ ] Geofence zones configured
- [ ] Backup strategy in place
- [ ] Monitoring tools set up
- [ ] Disaster recovery plan created
- [ ] Security audit completed

## Environment Setup

### 1. Production Environment Configuration

Create `.env` file with production values:

```env
# Database
DB_HOST=your-db-server.example.com
DB_PORT=5432
DB_NAME=attendance_prod
DB_USER=prod_user
DB_PASSWORD=secure_password_here

# Server
PORT=5000
NODE_ENV=production
JWT_SECRET=very_long_random_secret_key_min_32_chars

# Security
HTTPS_ENFORCED=true
ALLOWED_ORIGINS=https://attendance.university.edu,https://app.university.edu

# QR Code
QR_CODE_EXPIRY_MINUTES=5
QR_REFRESH_INTERVAL_SECONDS=30

# Geofencing
CAMPUS_LATITUDE=40.2065
CAMPUS_LONGITUDE=-111.8910
GEOFENCE_RADIUS_METERS=200
ALLOW_MULTIPLE_CAMPUSES=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
DEVICE_FINGERPRINT_ENABLED=true
```

## Deployment Options

### Option 1: Docker Containerization

#### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY backend/src ./src
COPY backend/database ./database

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if(r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "src/server.js"]
```

#### Frontend Dockerfile

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/src ./src
COPY frontend/public ./public

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: attendance_prod
      POSTGRES_USER: prod_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U prod_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: attendance_prod
      DB_USER: prod_user
      DB_PASSWORD: secure_password
      NODE_ENV: production
      JWT_SECRET: your_secret_key
      PORT: 5000
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "5000:5000"
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    environment:
      REACT_APP_API_URL: https://api.attendance.university.edu
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

**Deploy with Docker Compose:**

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: AWS Deployment

#### AWS Architecture
- **Frontend**: CloudFront + S3
- **Backend**: EC2 + Application Load Balancer
- **Database**: RDS PostgreSQL
- **SSL**: AWS Certificate Manager

#### Step-by-Step AWS Deployment

**1. Create RDS PostgreSQL Instance**
```bash
# AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier attendance-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --allocated-storage 100 \
  --vpc-security-group-ids sg-xxxxx
```

**2. Create EC2 Instance**
```bash
# Choose Ubuntu 22.04 LTS
# Instance type: t3.small (minimum)
# Security group: Allow 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

**3. Install on EC2**
```bash
# SSH into instance
ssh -i key.pem ec2-user@instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone repository
git clone https://github.com/university/attendance-system.git
cd attendance-system
```

**4. Deploy Backend**
```bash
cd backend
npm install --production

# Create .env with RDS endpoint
cp .env.example .env
nano .env

# Run migrations
psql -h rds-endpoint.amazonaws.com -U admin -d attendance_prod -f database/schema.sql

# Start with PM2
pm2 start src/server.js --name "attendance-api"
pm2 startup
pm2 save
```

**5. Setup Nginx Reverse Proxy**
```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/attendance-api

# Config content:
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

# Enable site
sudo ln -s /etc/nginx/sites-available/attendance-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**6. Setup SSL with Let's Encrypt**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Create certificate
sudo certbot certonly --standalone -d api.attendance.university.edu

# Auto-renew
sudo systemctl enable certbot.timer
```

**7. Setup Frontend on S3**
```bash
# Build React app
cd frontend
npm install
REACT_APP_API_URL=https://api.attendance.university.edu npm run build

# Create S3 bucket
aws s3 mb s3://attendance-app-university

# Upload build
aws s3 sync build/ s3://attendance-app-university/

# Configure as static website
aws s3 website s3://attendance-app-university \
  --index-document index.html \
  --error-document index.html
```

### Option 3: Google Cloud Platform

**1. Create Cloud SQL instance**
```bash
gcloud sql instances create attendance-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

**2. Deploy to App Engine**
```bash
# Create app.yaml
echo "runtime: nodejs18
env: standard
" > app.yaml

# Deploy
gcloud app deploy backend/
```

**3. Deploy frontend to Cloud Storage + CDN**
```bash
export PROJECT_ID=$(gcloud config get-value project)

gsutil mb gs://attendance-app-$PROJECT_ID
gsutil -m cp -r frontend/build/* gs://attendance-app-$PROJECT_ID/
gsutil iam ch serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com:objectViewer gs://attendance-app-$PROJECT_ID
```

### Option 4: On-Premise Deployment

**System Requirements:**
- Ubuntu 20.04 LTS or similar
- 4GB RAM minimum
- 50GB storage
- Reliable internet connection

**Installation Steps:**

```bash
# 1. Install dependencies
sudo apt update
sudo apt install -y curl wget git nginx postgresql

# 2. Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs

# 3. Create app directory
sudo mkdir -p /opt/attendance
sudo chown $USER:$USER /opt/attendance
cd /opt/attendance

# 4. Clone and setup
git clone https://github.com/university/attendance.git .
cd backend && npm install && cd ..

# 5. Setup PostgreSQL
sudo systemctl start postgresql
sudo -u postgres createdb attendance_db
sudo -u postgres psql -d attendance_db -f backend/database/schema.sql

# 6. Configure environment
cp backend/.env.example backend/.env
editor backend/.env

# 7. Install PM2
sudo npm install -g pm2
cd backend && pm2 start src/server.js
pm2 startup
pm2 save

# 8. Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/attendance
sudo ln -s /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Network Configuration

### Firewall Rules

**For AWS/GCP:**
- Inbound 80 (HTTP) from 0.0.0.0/0
- Inbound 443 (HTTPS) from 0.0.0.0/0
- Inbound 22 (SSH) from admin IP only
- Outbound 5432 (PostgreSQL) to DB security group
- Outbound 443 (HTTPS) for external APIs

### SSL/TLS Configuration

**Using Let's Encrypt (Free):**
```bash
sudo apt install certbot
sudo certbot certonly --webroot -w /var/www/html -d attendance.university.edu
```

**Configure Automatic Renewal:**
```bash
# Create renewal script
sudo nano /usr/local/bin/renew-ssl.sh
#!/bin/bash
certbot renew --quiet

# Add to crontab
sudo crontab -e
0 3 * * * /usr/local/bin/renew-ssl.sh >> /var/log/ssl-renew.log 2>&1
```

## Database Backup & Recovery

### Automated Backups

**PostgreSQL Backup Script:**
```bash
#!/bin/bash
# File: /opt/attendance/backup-db.sh

BACKUP_DIR="/opt/attendance/backups"
DB_NAME="attendance_db"
DB_USER="postgres"
DATE=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR

pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/attendance_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "attendance_*.sql.gz" -mtime +30 -delete
```

**Schedule via Crontab:**
```bash
0 2 * * * /opt/attendance/backup-db.sh
```

**Backup to S3:**
```bash
# Install AWS CLI
pip install awscli

# Add to backup script
aws s3 cp $BACKUP_DIR/attendance_$DATE.sql.gz s3://attendance-backups/
```

### Recovery Procedure

```bash
# List backups
ls -la /opt/attendance/backups/

# Restore
gunzip < /opt/attendance/backups/attendance_20240120_140000.sql.gz | psql -U postgres attendance_db
```

## Monitoring & Logging

### Health Checks

**API Health Endpoint:**
```bash
# Add to systemd service
ExecStartPost=/bin/curl -f http://localhost:5000/health || /bin/false
```

### Log Aggregation

**Using ELK Stack (Elasticsearch, Logstash, Kibana):**

1. Install Elasticsearch
2. Configure Logstash to parse Node.js logs
3. Visualize in Kibana

**Basic Logging Setup:**
```javascript
// In backend/src/server.js
const bunyan = require('bunyan');
const log = bunyan.createLogger({ name: 'AttendanceAPI' });

app.use((req, res, next) => {
  log.info({ method: req.method, path: req.path });
  next();
});
```

### Performance Monitoring

**Key Metrics:**
- Request response time: target <100ms
- Database query time: target <50ms
- API availability: target 99.9%
- QR scan success rate: target >95%

**Tools:**
- New Relic
- Datadog
- Prometheus + Grafana

## Scaling Considerations

### Horizontal Scaling
1. Setup load balancer (AWS ALB)
2. Create auto-scaling group
3. Use RDS for database (managed)
4. CloudFront for CDN

### Vertical Scaling
- Increase server RAM
- Upgrade CPU
- Upgrade database instance

### Caching Strategy
- Redis for session caching
- Database query caching
- CDN for static assets

## Troubleshooting

### Common Deployment Issues

**Connection to Database Failed:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U admin -d attendance_db -c "SELECT 1;"
```

**Port Already in Use:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

**SSL Certificate Issues:**
```bash
# Check certificate expiry
curl -vI https://api.attendance.university.edu

# Renew manually
sudo certbot renew --force-renewal
```

## Post-Deployment

### 1. Create Admin Account
```bash
# SSH to server
ssh -i key.pem ubuntu@server-ip

# Create super admin user
psql -U postgres -d attendance_db << EOF
INSERT INTO users (user_id, email, password_hash, full_name, role)
VALUES ('ADMIN001', 'admin@university.edu', '\$2a\$10\$...', 'Admin User', 'SUPER_ADMIN');
EOF
```

### 2. Configure Geofence Zones
Login to admin dashboard and configure:
- Campus center coordinates
- Geofence radius (200-500m)
- Multiple zones for different buildings

### 3. Send to Faculty
- Provide login credentials
- Share documentation links
- Conduct training session

### 4. Monitoring Setup
- Set warning thresholds
- Configure alerts
- Test failover procedures

## Rollback Procedure

If issues occur in production:

```bash
# 1. Identify issue from logs
pm2 logs

# 2. Revert to previous version
git log --oneline
git checkout <previous-commit>

# 3. Reinstall dependencies
npm install

# 4. Restart service
pm2 restart attendance-api

# 5. Restore database if needed
psql -U postgres attendance_db < backups/attendance_*.sql
```

## Version Upgrade

To upgrade to a newer version:

```bash
# 1. Backup database
pg_dump -U postgres attendance_db > backup_pre_upgrade.sql

# 2. Pull latest code
git pull origin main

# 3. Install new dependencies
npm install

# 4. Run migrations
psql -U postgres -d attendance_db -f database/schema.sql

# 5. Restart service
pm2 restart attendance-api

# 6. Verify deployment
curl https://api.attendance.university.edu/health
```

## Support

For deployment issues:
- Check logs: `pm2 logs`
- Verify config: `cat .env`
- Test database: `psql -U postgres -c "SELECT 1;"`
- Contact: devops@university.edu
