const fs = require('fs');
let f = fs.readFileSync('src/pages/SaaSAdmin/SaasAdminHotels.jsx', 'utf8');

// Import useToast
f = f.replace(/import \{ sendAdminEmail/g, 'import { useToast } from "../../Context/ToastContext";\nimport { sendAdminEmail');

// Initialize toast
f = f.replace(/const \[actionError, setActionError\] = useState\(""\);/g, 'const toast = useToast();');

// Remove setActionError("")
f = f.replace(/setActionError\(""\);/g, '');

// Replace setActionError(xxx) with toast.error(xxx)
f = f.replace(/setActionError\(/g, 'toast.error(');

// Remove ActionError component definition
f = f.replace(/const ActionError = \(\) =>[\s\S]*?\) : null;/g, '');

// Remove JSX usages of ActionError
f = f.replace(/\{actionError && <div className="mt-3">\{ActionError\(\)\}<\/div>\}/g, '');
f = f.replace(/\{actionError && \(\s*<ActionError \/>\s*\)\}/g, '');
f = f.replace(/\{ActionError\(\)\}/g, '');
f = f.replace(/\{actionError && <div className="mt-3">toast\.error\(\)<\/div>\}/g, ''); // in case we did something weird

fs.writeFileSync('src/pages/SaaSAdmin/SaasAdminHotels.jsx', f);
console.log("Done");
