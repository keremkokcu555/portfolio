import re

js_path = r'c:\Users\LENOVO\Desktop\portfolio\frontend\static\js\app.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Portfolio JS
# Keep apiBase, fetchJson, updatePreview(maybe not needed), loadData, renderOverview.
# We can just copy app.js and remove submitForm, profileForm, and the click listener for list-actions.
port_js = js
port_js = re.sub(r'const submitForm = async.*?// Logout', '// Logout', port_js, flags=re.DOTALL)
port_js = re.sub(r'const updateDashboardCounts.*?\/\/ Form gönderildikten sonra sayıları güncelle', '', port_js, flags=re.DOTALL)
port_js = re.sub(r'document\.querySelectorAll\(\'\.data-form\'\).*?\}\);', '', port_js, flags=re.DOTALL)
port_js = re.sub(r'const profileForm =.*?const languagesList = document\.getElementById\(\'languages-list\'\);', 
                 '''const educationList = document.getElementById('education-list');
const coursesList = document.getElementById('courses-list');
const certificatesList = document.getElementById('certificates-list');
const experiencesList = document.getElementById('experiences-list');
const projectsList = document.getElementById('projects-list');
const skillsList = document.getElementById('skills-list');
const languagesList = document.getElementById('languages-list');''', port_js, flags=re.DOTALL)

# In loadData, remove profileForm.querySelector logic
port_js = re.sub(r'Object\.keys\(profile\)\.forEach\(\(key\) => \{.*?updatePreview\(\'preview-profile_photo\', profile\.profile_photo\);', 
                 '', port_js, flags=re.DOTALL)
port_js = re.sub(r'if \(\!profileForm\).*?return;\s*\}', '', port_js, flags=re.DOTALL)

with open(r'c:\Users\LENOVO\Desktop\portfolio\frontend\static\js\portfolio.js', 'w', encoding='utf-8') as f:
    f.write(port_js)


# Admin JS
# Keep everything except renderOverview and visitor background logic
admin_js = js
admin_js = re.sub(r'const renderOverview = \(data, profile\) => \{.*?\}\s*;\s*const submitForm', 'const submitForm', admin_js, flags=re.DOTALL)
# Remove visitor background injection from renderOverview
# Actually, since renderOverview is deleted, it's already gone.
# In loadData, remove the call to renderOverview
admin_js = re.sub(r'if \(isVisitor\) \{\s*renderOverview.*?\s*\}', '', admin_js, flags=re.DOTALL)
admin_js = re.sub(r'const isVisitor = document\.body\.classList\.contains\(\'visitor-mode\'\);', '', admin_js, flags=re.DOTALL)
admin_js = re.sub(r'if \(isVisitor && input\.value.*?\s*\}', '', admin_js, flags=re.DOTALL)

with open(r'c:\Users\LENOVO\Desktop\portfolio\frontend\static\js\admin.js', 'w', encoding='utf-8') as f:
    f.write(admin_js)

print("Split JS completed.")
