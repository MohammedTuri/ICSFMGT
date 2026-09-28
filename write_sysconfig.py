content = open("D:/File Management System/sysconfig_content.txt", "r", encoding="utf-8").read()
with open("D:/File Management System/frontend/src/pages/SystemConfiguration.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
