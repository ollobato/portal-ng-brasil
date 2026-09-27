const fs = require('fs');
const file = '/Volumes/SSD 2TB | OLLOBATO/Clientes/Portal NG Brasil/6. Portal/src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /  const \[isAutoPilot, setIsAutoPilot\] = useState\(\(\) => \{\n    return localStorage\.getItem\('portal_ng_autopilot'\) === 'true';\n  \}\);\n  const \[autoPilotHours, setAutoPilotHours\] = useState\(1\); \/\/ 1, 2, 4, 8\n\n  React\.useEffect\(\(\) => \{\n    localStorage\.setItem\('portal_ng_autopilot', isAutoPilot \? 'true' : 'false'\);\n  \}, \[isAutoPilot\]\);\n\n  React\.useEffect\(\(\) => \{\n    let intervalId = null;\n    if \(isAutoPilot && !isRobotRunning\) \{\n      const ms = autoPilotHours \* 60 \* 60 \* 1000;\n      intervalId = setInterval\(\(\) => \{\n        console\.log\("Piloto Automático: disparando varredura..."\);\n        runRobotPipeline\(\{ preventDefault: \(\) => \{\} \}\);\n      \}, ms\);\n    \}\n    return \(\) => \{\n      if \(intervalId\) clearInterval\(intervalId\);\n    \};\n  \}, \[isAutoPilot, isRobotRunning, autoPilotHours\]\);/g;

const matches = [...content.matchAll(regex)];

if (matches.length === 2) {
  // Remove the first occurrence
  content = content.substring(0, matches[0].index) + content.substring(matches[0].index + matches[0][0].length);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Fixed duplicates!");
} else {
  console.log("Found " + matches.length + " occurrences. Check manually.");
}
