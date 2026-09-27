const fs = require('fs');
const file = '/Volumes/SSD 2TB | OLLOBATO/Clientes/Portal NG Brasil/6. Portal/src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find the block of autopilot
const autopilotBlock = `  const [isAutoPilot, setIsAutoPilot] = useState(() => {
    return localStorage.getItem('portal_ng_autopilot') === 'true';
  });
  const [autoPilotHours, setAutoPilotHours] = useState(1); // 1, 2, 4, 8

  React.useEffect(() => {
    localStorage.setItem('portal_ng_autopilot', isAutoPilot ? 'true' : 'false');
  }, [isAutoPilot]);

  React.useEffect(() => {
    let intervalId = null;
    if (isAutoPilot && !isRobotRunning) {
      const ms = autoPilotHours * 60 * 60 * 1000;
      intervalId = setInterval(() => {
        console.log("Piloto Automático: disparando varredura...");
        runRobotPipeline({ preventDefault: () => {} });
      }, ms);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoPilot, isRobotRunning, autoPilotHours]);`;

// Remove the block from its current position
content = content.replace(autopilotBlock, "");

// Insert the block just after `const [robotStatus, setRobotStatus] = useState('');` which is at line 181
const insertAfter = `const [robotStatus, setRobotStatus] = useState('');`;
content = content.replace(insertAfter, insertAfter + "\n\n" + autopilotBlock);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched 3 successfully");
