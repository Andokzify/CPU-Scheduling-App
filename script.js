// =============================================
// COLOR SETTINGS
// =============================================

// List of colors used for jobs (loops if jobs > 8)
const JOB_COLORS = [
  "#f7d02a", // yellow (J1)
  "#4fc3f7", // blue   (J2)
  "#81c784", // green  (J3)
  "#ff8a65", // orange (J4)
  "#ce93d8", // purple (J5)
  "#f48fb1", // pink   (J6)
  "#80deea", // cyan   (J7)
  "#ffcc80", // peach  (J8)
];

// Returns a color based on job position
function getColor(index) {
  return JOB_COLORS[index % JOB_COLORS.length];
}


// =============================================
// INITIAL JOB DATA (Now Empty)
// =============================================

// We keep the IDs (J1, J2, etc.) so the rows exist, but leave the values blank
let jobs = [
  { id: "J1", arrival: "", burst: "",  priority: "" },
  { id: "J2", arrival: "", burst: "",  priority: "" },
  { id: "J3", arrival: "", burst: "",  priority: "" },
  { id: "J4", arrival: "", burst: "",  priority: "" }
];


// =============================================
// APP START
// =============================================

// Build table immediately when page loads
window.onload = function() {
  buildTable();
};


// =============================================
// TABLE MANAGEMENT (UI ↔ DATA)
// =============================================

// Builds the table from the jobs array
function buildTable() {
  let tbody = document.getElementById("tableBody");
  tbody.innerHTML = ""; // clear existing rows

  for (let i = 0; i < jobs.length; i++) {
    let color = getColor(i); // assign color per job
    let row   = document.createElement("tr");

    row.innerHTML = `
      <td>
        <span class="color-dot" style="background: ${color};"></span>
        ${jobs[i].id}
      </td>
      <td>
        <input type="number" value="${jobs[i].arrival}" min="0"
          oninput="highlightIfBad(this, 'arrival')"
          onchange="updateJob(${i}, 'arrival', this.value)">
      </td>
      <td>
        <input type="number" value="${jobs[i].burst}" min="1"
          oninput="highlightIfBad(this, 'burst')"
          onchange="updateJob(${i}, 'burst', this.value)">
      </td>
      <td>
        <input type="number" value="${jobs[i].priority}" min="1"
          oninput="highlightIfBad(this, 'priority')"
          onchange="updateJob(${i}, 'priority', this.value)">
      </td>
      <td>
        <button class="del-btn" onclick="deleteJob(${i})">✕</button>
      </td>
    `;

    tbody.appendChild(row);
  }

  // Update job counter display
  document.getElementById("jobCount").textContent = jobs.length;
}

// Updates a specific job field when input changes
function updateJob(index, field, value) {
  jobs[index][field] = parseInt(value);
}

// Adds a new job with default values
function addJob() {
  let n = jobs.length + 1;
  // Change the numbers to empty strings ""
  jobs.push({ id: "J" + n, arrival: "", burst: "", priority: "" });
  buildTable();
  hideError();
}

// Removes the last job in the list
function removeJob() {
  if (jobs.length <= 1) {
    showError("You need at least 1 job!");
    return;
  }
  jobs.pop();
  buildTable();
  hideError();
}

// Deletes a specific job by index
function deleteJob(index) {
  if (jobs.length <= 1) {
    showError("You need at least 1 job!");
    return;
  }
  jobs.splice(index, 1);
  buildTable();
  hideError();
}

// Reads all input values and saves them into jobs array
function saveTableData() {
  let rows = document.querySelectorAll("#tableBody tr");

  for (let i = 0; i < rows.length; i++) {
    let inputs       = rows[i].querySelectorAll("input");
    jobs[i].arrival  = parseInt(inputs[0].value);
    jobs[i].burst    = parseInt(inputs[1].value);
    jobs[i].priority = parseInt(inputs[2].value);
  }
}


// =============================================
// INPUT VALIDATION (LIVE WHILE TYPING)
// =============================================

// Highlights input red if value is invalid
function highlightIfBad(input, field) {
  let val = parseInt(input.value);

  let isBad = isNaN(val)
    || (field === "arrival"  && val < 0)
    || (field === "burst"    && val < 1)
    || (field === "priority" && val < 1);

  if (isBad) {
    input.classList.add("input-error"); // mark invalid
  } else {
    input.classList.remove("input-error"); // remove highlight
  }
}


// =============================================
// FINAL VALIDATION (BEFORE CALCULATION)
// =============================================

// Ensures all job inputs are valid before running algorithm
function validate() {
  saveTableData();

  for (let i = 0; i < jobs.length; i++) {
    let job = jobs[i];

    if (isNaN(job.arrival) || isNaN(job.burst) || isNaN(job.priority)) {
      showError(job.id + ": All fields must be filled in with numbers.");
      return false;
    }
    if (job.arrival < 0) {
      showError(job.id + ": Arrival time cannot be negative.");
      return false;
    }
    if (job.burst < 1) {
      showError(job.id + ": Burst time must be at least 1.");
      return false;
    }
    if (job.priority < 1) {
      showError(job.id + ": Priority must be at least 1.");
      return false;
    }
  }

  return true; // valid
}


// =============================================
// MAIN CALCULATION CONTROLLER
// =============================================

// Tracks if calculate button was clicked before
let hasCalculated = false;

function calculate() {
  // Prevent auto-run from dropdown before first calculation
  let calledByDropdown = !event || event.type === "change";
  if (calledByDropdown && !hasCalculated) return;

  hideError();
  if (!validate()) return;

  hasCalculated = true;

  let algo = document.getElementById("algorithm").value;

  // Select algorithm
  let ganttBlocks;
  if      (algo === "FCFS") ganttBlocks = runFCFS(jobs);
  else if (algo === "NPP")  ganttBlocks = runNPP(jobs);
  else if (algo === "SJF")  ganttBlocks = runSJF(jobs);
  else {
    showError(algo + " is not implemented yet.");
    return;
  }

  // Compute results
  let results = calculateResults(jobs, ganttBlocks);

  // Display outputs
  displayGantt(ganttBlocks);
  displayTAT(results);
  displayWT(results);
  displayTimeline(jobs);
  displayCPU(jobs, ganttBlocks);
}


// =============================================
// SCHEDULING ALGORITHMS
// =============================================

// ---------- FCFS (First Come First Serve) ----------
// Executes jobs in order of arrival time
function runFCFS(jobs) {
  let sorted      = [...jobs].sort((a, b) => a.arrival - b.arrival);
  let ganttBlocks = [];
  let clock       = 0;

  for (let i = 0; i < sorted.length; i++) {
    let job = sorted[i];

    // Insert IDLE if CPU is waiting
    if (clock < job.arrival) {
      ganttBlocks.push({ id: "IDLE", start: clock, end: job.arrival });
      clock = job.arrival;
    }

    ganttBlocks.push({ id: job.id, start: clock, end: clock + job.burst });
    clock = clock + job.burst;
  }

  return ganttBlocks;
}


// ---------- NPP (Non-Preemptive Priority) ----------
// Picks the job with highest priority (lowest number)
function runNPP(jobs) {
  let remaining   = [...jobs];
  let ganttBlocks = [];
  let clock       = 0;
  let done        = 0;

  while (done < jobs.length) {
    let available = remaining.filter(j => j.arrival <= clock);

    // If no job is ready, CPU becomes idle
    if (available.length === 0) {
      let nextArrival = Math.min(...remaining.map(j => j.arrival));
      ganttBlocks.push({ id: "IDLE", start: clock, end: nextArrival });
      clock = nextArrival;
      continue;
    }

    // Find job with highest priority
    let best = available[0];
    for (let i = 1; i < available.length; i++) {
      if (available[i].priority < best.priority) best = available[i];
    }

    ganttBlocks.push({ id: best.id, start: clock, end: clock + best.burst });
    clock = clock + best.burst;
    done++;
    remaining = remaining.filter(j => j.id !== best.id);
  }

  return ganttBlocks;
}


// ---------- SJF (Shortest Job First) ----------
// Picks the job with the shortest burst time.
function runSJF(jobs) {
  let remaining   = [...jobs];
  let ganttBlocks = [];
  let clock       = 0;
  let done        = 0;

  while (done < jobs.length) {
    let available = remaining.filter(j => j.arrival <= clock);

    // If no job has arrived yet, jump to the next one and record IDLE
    if (available.length === 0) {
      let nextArrival = Math.min(...remaining.map(j => j.arrival));
      ganttBlocks.push({ id: "IDLE", start: clock, end: nextArrival });
      clock = nextArrival;
      continue;
    }

    // Pick the job with the shortest burst time
    let best = available[0];
    for (let i = 1; i < available.length; i++) {
      if (available[i].burst < best.burst) best = available[i];
    }

    ganttBlocks.push({ id: best.id, start: clock, end: clock + best.burst });
    clock = clock + best.burst;
    done++;
    remaining = remaining.filter(j => j.id !== best.id);
  }

  return ganttBlocks;
}


// =============================================
// RESULT COMPUTATION
// =============================================

// Computes completion time, turnaround time, and waiting time
function calculateResults(jobs, ganttBlocks) {
  let results = [];

  for (let i = 0; i < jobs.length; i++) {
    let job       = jobs[i];
    let myBlocks  = ganttBlocks.filter(b => b.id === job.id);
    let lastBlock = myBlocks[myBlocks.length - 1];

    let completionTime = lastBlock.end;
    let tat = completionTime - job.arrival;
    let wt  = tat - job.burst;

    results.push({ id: job.id, completionTime: completionTime, tat: tat, wt: wt });
  }

  return results;
}


// =============================================
// DISPLAY FUNCTIONS (OUTPUT TO UI)
// =============================================

// ---------- Gantt Chart ----------
function displayGantt(ganttBlocks) {
  let firstTime = ganttBlocks[0].start;
  let totalTime = ganttBlocks[ganttBlocks.length - 1].end;
  let span      = totalTime - firstTime;

  let barsDiv   = document.getElementById("ganttBars");
  let labelsDiv = document.getElementById("burstLabels");
  let timeDiv   = document.getElementById("timeLabels");

  barsDiv.innerHTML = labelsDiv.innerHTML = timeDiv.innerHTML = "";

  for (let i = 0; i < ganttBlocks.length; i++) {
    let block    = ganttBlocks[i];
    let duration = block.end - block.start;
    let pct      = (duration / span) * 100 + "%";
    let isIdle   = block.id === "IDLE";

    let jobIndex = jobs.findIndex(j => j.id === block.id);
    let color    = isIdle ? "#2a2a2a" : getColor(jobIndex);
    let txtColor = isIdle ? "#666"    : "#111";

    // Burst label
    labelsDiv.innerHTML += `
      <div style="width: ${pct}; text-align: center; color: #f7e68a;">
        ${isIdle ? "" : duration}
      </div>`;

    // Bar
    barsDiv.innerHTML += `
      <div class="gantt-bar" style="width: ${pct}; background: ${color}; color: ${txtColor};
        border: ${isIdle ? "2px dashed #444" : "2px solid #111"};
        font-style: ${isIdle ? "italic" : "normal"};">
        ${block.id}
      </div>`;

    // Time labels
    timeDiv.innerHTML += `<div>${block.start}</div>`;
  }

  timeDiv.innerHTML += `<div class="end-time">${totalTime}</div>`;
}


// ---------- Turnaround Time ----------
function displayTAT(results) {
  let total = 0;
  let lines = "";

  for (let i = 0; i < results.length; i++) {
    let r       = results[i];
    let arrival = r.completionTime - r.tat;
    let color   = getColor(i);
    total      += r.tat;

    lines += `
      <div class="result-line" style="border-left: 4px solid ${color};">
        tt${i+1} = ${r.completionTime} - ${arrival} = <b>${r.tat}</b>
      </div>`;
  }

  let avg = (total / results.length).toFixed(2);

  document.getElementById("tatBox").innerHTML = `
    <div class="result-row">
      <div class="result-lines">${lines}</div>
      <div class="avg-box">AVERAGE TAT<br><br><b>${avg} ms</b></div>
    </div>`;
}


// ---------- Waiting Time ----------
function displayWT(results) {
  let total = 0;
  let lines = "";

  for (let i = 0; i < results.length; i++) {
    let r     = results[i];
    let burst = r.tat - r.wt;
    let color = getColor(i);
    total    += r.wt;

    lines += `
      <div class="result-line" style="border-left: 4px solid ${color};">
        wt${i+1} = ${r.tat} - ${burst} = <b>${r.wt}</b>
      </div>`;
  }

  let avg = (total / results.length).toFixed(2);

  document.getElementById("wtBox").innerHTML = `
    <div class="result-row">
      <div class="result-lines">${lines}</div>
      <div class="avg-box">AVERAGE WT<br><br><b>${avg} ms</b></div>
    </div>`;
}


// ---------- Timeline ----------
function displayTimeline(jobs) {
  let ids = "", ticks = "", arrivals = "";

  for (let i = 0; i < jobs.length; i++) {
    let color  = getColor(i);
    ids      += `<div class="tl-cell" style="color: ${color};">${jobs[i].id}</div>`;
    ticks    += `<div class="tl-cell" style="color: ${color};">|</div>`;
    arrivals += `<div class="tl-cell">${jobs[i].arrival}</div>`;
  }

  document.getElementById("timelineBox").innerHTML = `
    <div class="timeline-chart">
      <div class="tl-row">${ids}</div>
      <div class="tl-row tl-middle">${ticks}</div>
      <div class="tl-row">${arrivals}</div>
    </div>`;
}


// ---------- CPU Utilization ----------
function displayCPU(jobs, ganttBlocks) {
  // Sum of all burst times
  let totalBurst = 0;
  for (let i = 0; i < jobs.length; i++) {
    totalBurst += jobs[i].burst;
  }

  // Total time span
  let totalSpan = ganttBlocks[ganttBlocks.length - 1].end - ganttBlocks[0].start;

  // Total idle time
  let idleTime = 0;
  for (let i = 0; i < ganttBlocks.length; i++) {
    if (ganttBlocks[i].id === "IDLE") {
      idleTime += ganttBlocks[i].end - ganttBlocks[i].start;
    }
  }

  let burstParts  = jobs.map(j => j.burst).join(" + ");
  let utilization = ((totalBurst / totalSpan) * 100).toFixed(0);

  document.getElementById("cpuBox").innerHTML = `
    <div class="cpu-display">
      <div>${burstParts}</div>
      <div class="cpu-line"></div>
      <div>${totalSpan}</div>
      <br>
      <div>${totalBurst} / ${totalSpan} = ${(totalBurst / totalSpan).toFixed(2)} × 100 =
        <span class="cpu-result">${utilization}%</span>
      </div>
      <br>
      <div class="idle-info">IDLE TIME: <b>${idleTime}</b> units</div>
    </div>`;
}


// =============================================
// RESET APP
// =============================================
function resetApp() {
  // 1. Clear the data back to empty strings
  jobs = [
    { id: "J1", arrival: "", burst: "",  priority: "" },
    { id: "J2", arrival: "", burst: "",  priority: "" },
    { id: "J3", arrival: "", burst: "",  priority: "" },
    { id: "J4", arrival: "", burst: "",  priority: "" }
  ];

  // 2. Reset the dropdown
  document.getElementById("algorithm").value = "FCFS";

  // 3. Clear result boxes (Notice: No backslashes here)
  let panels = ["tatBox", "wtBox", "timelineBox", "cpuBox"];
  let msgs   = [
    "Results will appear after calculation",
    "Results will appear after calculation",
    "Timeline will appear after calculation",
    "Will appear after calculation"
  ];

  for (let i = 0; i < panels.length; i++) {
    let box       = document.getElementById(panels[i]);
    box.innerHTML = msgs[i];
    box.className = "panel-content gray-text";
  }

  // 4. Clear Gantt Chart
  document.getElementById("ganttBars").innerHTML   = "";
  document.getElementById("burstLabels").innerHTML = "";
  document.getElementById("timeLabels").innerHTML  = "";

  hasCalculated = false;
  hideError();
  buildTable(); // Refreshes the table with the empty values
}


// =============================================
// ERROR HANDLING
// =============================================

// Show error message on screen
function showError(message) {
  let box = document.getElementById("errorMsg");
  box.textContent = "⚠ " + message;
  box.style.display = "block";
}

// Hide error message and remove red highlights
function hideError() {
  document.getElementById("errorMsg").style.display = "none";

  let badInputs = document.querySelectorAll(".input-error");
  for (let i = 0; i < badInputs.length; i++) {
    badInputs[i].classList.remove("input-error");
  }
}
