import re

index_path = r'c:\Users\LENOVO\Desktop\portfolio\frontend\templates\index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    html = f.read()

# For portfolio.html: 
# Keep {% if not is_admin %}, remove {% if is_admin %}
port_html = html
port_html = re.sub(r'\{%\s*if\s+not\s+is_admin\s*%\}', '', port_html)
port_html = re.sub(r'\{%\s*endif\s*%\}', '', port_html)
port_html = port_html.replace('visitor-mode', 'visitor-mode') # Keep class
port_html = re.sub(r'<script src="/static/js/app.js.*?"></script>', '<script src="/static/js/portfolio.js"></script>', port_html)
# Remove the forms and dashboard cards which were hidden by CSS, but now we physically remove them.
# The main dashboard cards starts with <div class="dashboard-cards"> and ends before <section id="profile"
port_html = re.sub(r'<div class="dashboard-cards">.*?</section>', '</section>', port_html, flags=re.DOTALL)
# Also remove all forms
port_html = re.sub(r'<form.*?</form>', '', port_html, flags=re.DOTALL)
# Remove top-navbar
port_html = re.sub(r'<header class="top-navbar">.*?</header>', '', port_html, flags=re.DOTALL)
# The tab lists and buttons:
port_html = re.sub(r'<div class="list-actions">.*?</div>', '', port_html, flags=re.DOTALL)

with open(r'c:\Users\LENOVO\Desktop\portfolio\frontend\templates\portfolio.html', 'w', encoding='utf-8') as f:
    f.write(port_html)


# For admin.html:
admin_html = html
# Remove visitor-navbar completely. It is inside {% if not is_admin %} ... {% endif %}
admin_html = re.sub(r'\{%\s*if\s+not\s+is_admin\s*%\}.*?\{%\s*endif\s*%\}', '', admin_html, flags=re.DOTALL)
admin_html = admin_html.replace('{% if not is_admin %}visitor-mode{% endif %}', '')
# Ensure no visitor.css
admin_html = re.sub(r'<link rel="stylesheet" href="/static/css/visitor.css.*?/>', '', admin_html)
admin_html = re.sub(r'<script src="/static/js/app.js.*?"></script>', '<script src="/static/js/admin.js"></script>', admin_html)

with open(r'c:\Users\LENOVO\Desktop\portfolio\frontend\templates\admin.html', 'w', encoding='utf-8') as f:
    f.write(admin_html)

print("Split HTML completed.")
