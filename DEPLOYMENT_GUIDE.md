# 🚀 Deployment Guide: PythonAnywhere (Backend) & Netlify (Frontend)

This guide provides step-by-step instructions for deploying North Hospital HMS online.

---

## Part 1: Deploy Django Backend to PythonAnywhere

### Step 1: Push / Upload Code to PythonAnywhere
Open a Bash console in PythonAnywhere:
```bash
# Clone or upload your repository into your home directory:
git clone <your-repo-url> North-Hospital
cd ~/North-Hospital/backend
```

### Step 2: Create Virtual Environment & Install Dependencies
In the PythonAnywhere Bash console:
```bash
mkvirtualenv --python=/usr/bin/python3.10 hospital-venv
pip install -r requirements.txt
```

### Step 3: Run Migrations, Seed Data & Collect Static Files
```bash
python manage.py migrate
python manage.py seed_hospital
python manage.py collectstatic --noinput
```

### Step 4: Configure Web App in PythonAnywhere Dashboard
1. Go to the **Web** tab in PythonAnywhere.
2. Click **Add a new web app** $\rightarrow$ choose **Manual configuration** $\rightarrow$ select Python version (e.g. 3.10).
3. Under **Virtualenv**, enter:
   `/home/<your-username>/.virtualenvs/hospital-venv`
4. Under **Code**, click on the **WSGI configuration file** link (`/var/www/<your-username>_pythonanywhere_com_wsgi.py`).
5. Delete the default content and paste the code from [pythonanywhere_wsgi.py](file:///d:/North-Hospital/backend/pythonanywhere_wsgi.py):
   ```python
   import os
   import sys

   username = '<your-username>'  # Replace with your actual PythonAnywhere username

   project_home = f'/home/{username}/North-Hospital/backend'
   if project_home not in sys.path:
       sys.path.insert(0, project_home)

   apps_home = f'/home/{username}/North-Hospital/backend/apps'
   if apps_home not in sys.path:
       sys.path.insert(0, apps_home)

   os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'

   from django.core.wsgi import get_wsgi_application
   application = get_wsgi_application()
   ```
6. Under **Static files**, configure:
   - **URL:** `/static/`
   - **Directory:** `/home/<your-username>/North-Hospital/backend/staticfiles`
7. Click the green **Reload <your-username>.pythonanywhere.com** button.
8. Your backend API will now be live at:
   `https://<your-username>.pythonanywhere.com/api/v1`

---

## Part 2: Deploy React Frontend to Netlify

### Option A: Git Continuous Deployment (Recommended)
1. Push your code to GitHub / GitLab / Bitbucket.
2. Log in to [Netlify](https://app.netlify.com).
3. Click **Add new site** $\rightarrow$ **Import an existing project**.
4. Select your repository and set:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Under **Environment variables**, add:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://<your-username>.pythonanywhere.com/api/v1`
6. Click **Deploy site**.

### Option B: Drag-and-Drop Manual Upload
1. In your local terminal, navigate to `frontend`:
   ```powershell
   cd d:\North-Hospital\frontend
   npm run build
   ```
2. In Netlify, go to **Sites** $\rightarrow$ scroll down to **"Want to deploy manually?"**.
3. Drag and drop the generated `d:\North-Hospital\frontend\dist` folder directly into the browser.
4. Your site will instantly be deployed live with full SPA routing!
