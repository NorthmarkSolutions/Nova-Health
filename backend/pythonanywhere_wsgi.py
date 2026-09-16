# +-----------------------------------------------------------------------+
# | PythonAnywhere WSGI Configuration for North Hospital Django Backend   |
# +-----------------------------------------------------------------------+
# Copy this content into your PythonAnywhere WSGI configuration file:
# /var/www/<your-username>_pythonanywhere_com_wsgi.py

import os
import sys

# Replace '<your-username>' with your actual PythonAnywhere username:
username = '<your-username>'

project_home = f'/home/{username}/North-Hospital/backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

apps_home = f'/home/{username}/North-Hospital/backend/apps'
if apps_home not in sys.path:
    sys.path.insert(0, apps_home)

os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
