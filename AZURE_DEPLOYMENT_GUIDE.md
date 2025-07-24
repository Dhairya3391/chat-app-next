# Azure Deployment Guide for Global Chat App (Cost-Optimized)

## 📋 Project Overview

Your Global Chat Application is a real-time chat system with:

- **Frontend:** Next.js 15.2.4, React 19, TypeScript
- **Real-time:** Socket.IO (client & server)
- **Features:** Admin controls, IP banning, file transfers, curse word filtering
- **Admin Credentials:** username: `noobokay`, password: `noobokay`

## 💰 Cost-Optimized Hosting Strategy

**Estimated Monthly Cost: $0-13 USD**

- **Free Tier:** F1 App Service (1GB RAM, 1GB storage) - **FREE**
- **Low-Cost Tier:** B1 Basic (1.75GB RAM, 10GB storage) - ~$13/month
- **Recommended:** Start with F1 Free, upgrade to B1 only if needed

---

## 🚀 Step-by-Step Azure Deployment (CHEAPEST OPTIONS)

### **Step 1: Register Required Azure Providers (REQUIRED FOR STUDENT SUBSCRIPTIONS)**

```bash
# Register Microsoft.Web provider (required for App Services)
az provider register --namespace Microsoft.Web

# Check registration status (should show "Registered")
az provider show --namespace Microsoft.Web --query "registrationState"

# Optional: Register other useful providers for future use
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.Insights
```

**⚠️ IMPORTANT:** Wait for registration to complete before proceeding to next step!

### **Step 2: Create Azure Resource Group**

```bash
az group create --name chat-app-rg --location "East US"
```

### **Step 3: Create FREE App Service Plan**

```bash
# Option A: FREE TIER (F1) - $0/month - RECOMMENDED TO START
az appservice plan create \
  --name chat-app-free-plan \
  --resource-group chat-app-rg \
  --sku F1 \
  --is-linux

# Option B: BASIC TIER (B1) - ~$13/month - Only if Free tier insufficient
# az appservice plan create \
#   --name chat-app-plan \
#   --resource-group chat-app-rg \
#   --sku B1 \
#   --is-linux
```

### **Step 4: Create Web App (FREE TIER)**

```bash
az webapp create \
  --resource-group chat-app-rg \
  --plan chat-app-free-plan \
  --name NoobChat \
  --runtime "NODE:20-lts" \
  --startup-file "server.js"
```

_Note: Replace `NoobChat` with a unique name_

**💡 Runtime Note:** Using NODE:20-lts (Node.js 20 LTS) which is compatible with your Next.js app

**FREE TIER LIMITATIONS:**

- 1GB RAM, 1GB disk space
- 60 CPU minutes/day
- No custom domains (but .azurewebsites.net works fine)
- No auto-scaling
- Perfect for development/small usage

### **Step 5: Configure App Settings (Cost-Optimized)**

```bash
az webapp config appsettings set \
  --resource-group chat-app-rg \
  --name NoobChat \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    WEBSITE_NODE_DEFAULT_VERSION=20.11.0 \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    WEBSITE_RUN_FROM_PACKAGE=1
```

**💡 Cost-Saving Tip:** `WEBSITE_RUN_FROM_PACKAGE=1` reduces startup time and disk usage

### **Step 6: Enable WebSocket Support**

```bash
az webapp config set \
  --resource-group chat-app-rg \
  --name NoobChat \
  --web-sockets-enabled true
```

### **Step 7: Deploy Your Code (FREE OPTION)**

#### 🆓 Option A: Deploy from GitHub (RECOMMENDED - FREE)

```bash
az webapp deployment source config \
  --resource-group chat-app-rg \
  --name NoobChat \
  --repo-url https://github.com/Dhairya3391/chat-app-next \
  --branch main \
  --manual-integration
```

#### Option B: Deploy from Local Git (if needed)

```bash
# Initialize git in your project (if not already done)
git init
git add .
git commit -m "Initial commit for Azure deployment"

# Get the Git URL (FREE deployment method)
az webapp deployment source config-local-git \
  --resource-group chat-app-rg \
  --name NoobChat

# Add Azure as remote and push
git remote add azure <git-url-from-previous-command>
git push azure main
```

**💰 Cost Note:** Both deployment methods are completely free!

### **Step 8: SKIP Custom Domain (Save Money)**

```bash
# ❌ SKIP THIS STEP FOR FREE HOSTING
# Custom domains cost extra and require paid tiers
# Your app works perfectly at: your-app-name.azurewebsites.net
```

### **Step 9: SKIP Monitoring (Save Money)**

```bash
# ❌ SKIP APPLICATION INSIGHTS FOR NOW
# Application Insights has usage charges after free quota
# Use basic logs instead (free):
# az webapp log tail --resource-group chat-app-rg --name NoobChat
```

---

## 📁 Required Files Already Created

### 1. `.deployment` file ✅

```
[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

### 2. `server.js` file ✅

Custom server for Azure deployment with proper port handling.

### 3. `web.config` file ✅

IIS configuration for Azure App Service.

### 4. Updated `package.json` ✅

Added engines specification for Node.js version.

---

## 🔧 Post-Deployment Configuration (FREE TIER)

### **1. Environment Variables (Already Set Above):**

```bash
# These were already configured in Step 4 - no additional cost
```

### **2. Scale Settings (FREE TIER LIMITATIONS):**

```bash
# ❌ AUTO-SCALING NOT AVAILABLE ON FREE TIER
# ❌ SCALING UP COSTS MONEY

# If you need more resources later (only if necessary):
# az appservice plan update \
#   --resource-group chat-app-rg \
#   --name chat-app-free-plan \
#   --sku B1  # This will cost ~$13/month
```

---

## 💰 COST OPTIMIZATION STRATEGIES

### **Free Tier Benefits:**

- ✅ **$0/month** for hosting
- ✅ 1GB RAM, 1GB storage
- ✅ 60 CPU minutes/day (resets daily)
- ✅ WebSocket support included
- ✅ HTTPS included (.azurewebsites.net)
- ✅ Git deployment included

### **Usage Monitoring (Avoid Overages):**

```bash
# Monitor your daily CPU usage to stay within free limits
az webapp log tail --resource-group chat-app-rg --name NoobChat
```

### **When to Upgrade to B1 ($13/month):**

- CPU quota exhausted daily
- Need more than 1GB storage
- Need custom domain
- Need more concurrent users

### **Additional Cost-Saving Tips:**

1. **Use GitHub deployment** (free) instead of paid CI/CD
2. **Avoid Application Insights** initially (has paid features)
3. **No custom domain** needed (.azurewebsites.net works fine)
4. **Monitor usage** with free logs instead of paid monitoring
5. **Delete unused resources** regularly

---

## 🛠️ Troubleshooting Commands

### **Check Deployment Status:**

```bash
az webapp deployment list \
  --resource-group chat-app-rg \
  --name NoobChat
```

### **View Application Logs:**

```bash
az webapp log tail \
  --resource-group chat-app-rg \
  --name NoobChat
```

### **Restart Application:**

```bash
az webapp restart \
  --resource-group chat-app-rg \
  --name NoobChat
```

### **Get Application URL:**

```bash
az webapp show \
  --resource-group chat-app-rg \
  --name NoobChat \
  --query defaultHostName \
  --output tsv
```

---

## 📊 Important Notes (Cost-Optimized)

### **Free Tier Limitations:**

- **60 CPU minutes/day** - Your app sleeps when not used (good for costs!)
- **1GB storage** - Sufficient for bannedIps.json and bannedWords.json
- **No custom domains** - Use yourapp.azurewebsites.net (works perfectly)
- **Cold starts** - App may take 10-15 seconds to wake up
- **Single instance** - No horizontal scaling (but your file-based storage works perfectly)

### **File Persistence (FREE):**

- `bannedIps.json` and `bannedWords.json` stored on local file system
- Works perfectly for single-instance Free tier
- No additional storage costs

### **WebSocket Configuration (FREE):**

- WebSockets enabled and included in free tier
- Socket.IO works perfectly on F1 tier
- No additional charges for real-time features

### **Security Considerations (FREE):**

- HTTPS included with .azurewebsites.net domain
- IP banning works with Azure's proxy headers
- No additional security costs

### **Performance Expectations:**

- **Light usage:** Excellent performance
- **Cold starts:** 10-15 seconds when app wakes up
- **Active usage:** Normal performance once warmed up
- **Concurrent users:** 10-50 users should work fine on free tier

---

## 🎯 Next Steps After Deployment (FREE TIER)

1. **Test the application** at your Azure URL (.azurewebsites.net)
2. **Monitor CPU usage** to stay within free quota
3. **Set up simple logging** (free) instead of paid monitoring
4. **Only upgrade if necessary** when you hit free tier limits
5. **Share your app** - .azurewebsites.net domain works perfectly!

---

## 💡 AVOID THESE EXPENSIVE OPTIONS (Initially)

### **❌ Don't Use (Costs Money):**

```bash
# ❌ Premium App Service Plans (P1V2, P2V3, etc.)
# ❌ Azure SignalR Service ($$ for scaling)
# ❌ Azure Cosmos DB ($$ for persistence)
# ❌ Application Insights (after free quota)
# ❌ Custom domains (require paid tiers)
# ❌ SSL certificates (except free .azurewebsites.net)
# ❌ Azure CDN (not needed for chat app)
# ❌ Load balancers (F1 doesn't support multiple instances anyway)
```

### **✅ Use These FREE Alternatives:**

```bash
# ✅ F1 Free tier App Service
# ✅ .azurewebsites.net domain (HTTPS included)
# ✅ Local file storage (bannedIps.json, bannedWords.json)
# ✅ GitHub deployment
# ✅ Basic logging with az webapp log tail
# ✅ Single instance (your app is designed for this!)
```

---

## 🔗 Useful Commands Summary (Cost-Optimized)

```bash
# Quick status check (FREE)
az webapp show --resource-group chat-app-rg --name NoobChat --query state

# Get deployment URL (FREE)
az webapp show --resource-group chat-app-rg --name NoobChat --query defaultHostName

# View logs in real-time (FREE - USE THIS INSTEAD OF PAID MONITORING)
az webapp log tail --resource-group chat-app-rg --name NoobChat

# Restart if needed (FREE)
az webapp restart --resource-group chat-app-rg --name NoobChat

# Check resource usage (FREE)
az webapp log download --resource-group chat-app-rg --name NoobChat

# Delete everything if you want to stop costs (FREE to delete)
az group delete --name chat-app-rg --yes
```

## 💰 TOTAL COST BREAKDOWN

### **FREE TIER (Recommended):**

- **Monthly Cost: $0.00**
- **Limitations:** 60 CPU minutes/day, 1GB storage, cold starts
- **Perfect for:** Development, demos, light usage

### **Upgrade Path (If Needed):**

- **B1 Basic: ~$13.00/month**
- **Only upgrade when:** CPU quota exhausted daily OR need custom domain

**Your app will be available at:** `https://NoobChat.azurewebsites.net`

🎉 **CONGRATULATIONS!** You're hosting a full-featured chat app with real-time messaging, admin controls, file transfers, and IP banning for **COMPLETELY FREE** on Azure!
