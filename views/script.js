const socket = io("/");
const PEN_SIZE = 2;
const ERASER_SIZE = 40;
const canvas = document.getElementById("board");
canvas.oncontextmenu = function(e) {
  e.preventDefault();
  e.stopPropagation();
};
const context = canvas.getContext("2d");
var color = "#FFFFFF";
var pensize = PEN_SIZE;
const height = canvas.height = window.innerHeight;
const width = canvas.width = window.innerWidth;
var canvasState = null;
var mouseClicked = false,
  mouseReleased = true;
var prevY = null;
var prevX = null;
var myID;
var canvasColor = "#000000";
canvas.style["background-color"] = canvasColor;
context.fillStyle = canvasColor;
context.fillRect(0, 0, canvas.width, canvas.height);
canvas.addEventListener("mousedown", onMouseDown, false);
canvas.addEventListener("mouseup", onMouseUp, false);
canvas.addEventListener("mousemove", onMouseMove, false);
canvas.addEventListener("touchstart", function(event) {
  event.preventDefault();
  mouseClicked = true;
});

canvas.addEventListener("touchmove", function(e) {
  event.preventDefault();
  console.log(event.touches[0], event.type); //debug
  if (mouseClicked) {
    if (prevY == null && prevX == null) {
      prevX = e.touches[0].clientX - canvas.offsetLeft;
      prevY = e.touches[0].clientY - canvas.offsetTop;
    }
    let client_X = e.touches[0].clientX - canvas.offsetLeft;
    let client_Y = e.touches[0].clientY - canvas.offsetTop;
    context.beginPath();
    context.lineWidth = pensize;
    context.moveTo(prevX, prevY);
    context.lineTo(client_X, client_Y);

    context.strokeStyle = color;
    context.stroke();
    let color_details = color;
    let penSize = 2;
    if (canvasColor == color) {
      penSize = ERASER_SIZE;
      color_details = "eraser";
    }
    let line = {
      startX: prevX,
      startY: prevY,
      endX: client_X,
      endY: client_Y,
      color: color_details,
      penSize: penSize
    };
    plots.push(line);
    peers.forEach(conn => {
      conn.send({ type: "newLine", line: line });
    });
    prevY = client_Y;
    prevX = client_X;
  }
});

canvas.addEventListener("touchend", function(event) {
  event.preventDefault();
  mouseClicked = false;
  prevY = null;
  prevX = null;
});
const plots = [];
let url = new URL(window.location.href);
const myPeer = new Peer();
const peers = [];

function invertColor(hex, bw) {
  if (hex.indexOf("#") === 0) {
    hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    throw new Error("Invalid HEX color.");
  }
  var r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16);
  if (bw) {
    // http://stackoverflow.com/a/3943023/112731
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000000" : "#FFFFFF";
  }
  // invert color components
  r = (255 - r).toString(16);
  g = (255 - g).toString(16);
  b = (255 - b).toString(16);
  // pad each with zeros and return
  return "#" + padZero(r) + padZero(g) + padZero(b);
}

function padZero(str, len) {
  len = len || 2;
  let zeros = new Array(len).join("0");
  return (zeros + str).slice(-len);
}

function renderDoodle(data) {
  context.beginPath();
  let doodle_color = data["color"];
  if (data["color"] == "eraser") {
    doodle_color = canvasColor;
  } else if (data["color"] != canvasColor) {
    doodle_color = data["color"];
  } else {
    doodle_color = invertColor(data["color"], false);
  }
  context.lineWidth = data["penSize"];
  context.strokeStyle = doodle_color;
  context.moveTo(data["startX"], data["startY"]);
  context.lineTo(data["endX"], data["endY"]);
  context.stroke();
  context.lineWidth = pensize;
}

socket.on("user-connected", userId => {
  // console.log("New user connected:",userId)
  const conn = myPeer.connect(userId);
  conn.on("open", () => {
    conn.send({ type: "newId", userId: myID, plot: plots });
  });
  peers.push(conn);
});

myPeer.on("connection", conn => {
  conn.on("data", data => {
    if (data["type"] == "newId") {
      const conn = myPeer.connect(data["userId"]);
      peers.push(conn);
      data["plot"].forEach(line => renderDoodle(line));
      plots.push.apply(plots, data["plot"]);
    } else if (data["type"] == "newLine") {
      renderDoodle(data["line"]);
      plots.push(data["line"]);
    }
  });
});

myPeer.on("open", id => {
  socket.emit("join-room", ROOM_ID, id);
  myID = id;
});

function setColor(c) {
  if (c == canvasColor) {
    pensize = ERASER_SIZE;
  } else {
    pensize = PEN_SIZE;
  }
  color = c;
}

function onMouseDown(e) {
  mouseClicked = true;
}

function onMouseUp(e) {
  mouseClicked = false;
  prevY = null;
  prevX = null;
}

function onMouseMove(e) {
  if (mouseClicked) {
    if (prevY == null && prevX == null) {
      prevX = e.clientX - canvas.offsetLeft;
      prevY = e.clientY - canvas.offsetTop;
    }
    let client_X = e.clientX - canvas.offsetLeft;
    let client_Y = e.clientY - canvas.offsetTop;
    context.beginPath();
    context.lineWidth = pensize;
    context.moveTo(prevX, prevY);
    context.lineTo(client_X, client_Y);

    context.strokeStyle = color;
    context.stroke();
    let color_details = color;
    let penSize = 2;
    if (canvasColor == color) {
      penSize = ERASER_SIZE;
      color_details = "eraser";
    }
    let line = {
      startX: prevX,
      startY: prevY,
      endX: client_X,
      endY: client_Y,
      color: color_details,
      penSize: penSize
    };
    plots.push(line);
    peers.forEach(conn => {
      conn.send({ type: "newLine", line: line });
    });
    prevY = client_Y;
    prevX = client_X;
  }
}

function initialize() {
  // each time the window is resized.
  window.addEventListener("resize", resizeCanvas, false);
  resizeCanvas();

  function resizeCanvas() {
    context.fillStyle = invertColor(canvasColor, true);
    canvas.style["background-color"] = canvasColor;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    plots.forEach(plot => renderDoodle(plot));
    invertBackgroundColor();
    invertBackgroundColor();
  }
}

initialize();

function download(href, filename) {
  /// create an "off-screen" anchor tag
  var lnk = document.createElement("a"),
    e;

  /// the key here is to set the download attribute of the a tag
  lnk.download = filename;

  /// convert canvas content to data-uri for link. When download
  /// attribute is set the content pointed to by link will be
  /// pushed as "download" in HTML5 capable browsers
  lnk.href = href;

  /// create a "fake" click-event to trigger the download
  if (document.createEvent) {
    e = document.createEvent("MouseEvents");
    e.initMouseEvent(
      "click",
      true,
      true,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null
    );

    lnk.dispatchEvent(e);
  } else if (lnk.fireEvent) {
    lnk.fireEvent("onclick");
  }
}
document.getElementById("asImage").addEventListener("click", downloadImage);
async function downloadImage(e) {
  e.preventDefault();
  document.getElementById("modal-wrapper").style.display = "none";
  let D = Date()
    .toString()
    .split(" ");
  let filename =
    "board" + "-" + D[2] + "-" + D[1] + "-" + D[3] + "-" + D[4] + ".png";
  download(canvas.toDataURL("image/png;base64"), filename);
}

document.getElementById("asJSON").addEventListener("click", downloadJSON);
async function downloadJSON(e) {
  e.preventDefault();
  document.getElementById("modal-wrapper").style.display = "none";
  let D = Date()
    .toString()
    .split(" ");
  let filename =
    "board" + "-" + D[2] + "-" + D[1] + "-" + D[3] + "-" + D[4] + ".json";
  let dataStr =
    "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plots));
  download(dataStr, filename);
}

function readTextFile(file, callback) {
  var rawFile = new XMLHttpRequest();
  rawFile.overrideMimeType("application/json");
  rawFile.open("GET", file, true);
  rawFile.onreadystatechange = function() {
    if (rawFile.readyState === 4 && rawFile.status == "200") {
      callback(rawFile.responseText);
    }
  };
  rawFile.send(null);
}

function uploadPlot() {
  var el = (window._protected_reference = document.createElement("INPUT"));
  el.type = "file";
  el.accept = "application/json";
  //el.multiple = "multiple"; // remove to have a single file selection

  // (cancel will not trigger 'change')
  el.addEventListener("change", function(ev2) {
    // access el.files[] to do something with it (test its length!)
    if (el.files.length) {
      console.log(el.files[0]);
    }

    // test some async handling
    new Promise(function(resolve) {
      setTimeout(function() {
        console.log(el.files[0].result);
        resolve();
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = function(evt) {
          if (evt.target.readyState == FileReader.DONE) {
            // DONE == 2
            let data = JSON.parse(evt.target.result);
            data.forEach(line => {
              renderDoodle(line);
              plots.push(line);
              peers.forEach(conn => {
                conn.send({ type: "newLine", line: line });
              });
            });
            console.log(JSON.parse(evt.target.result));
          }
        };

        //var blob = file.slice(start, stop + 1);
        reader.readAsText(el.files[0]);
        //.readAsText()
        // readTextFile(el.files[0].mozFullPath, function(text){
        //     let data = JSON.parse(text);
        //     console.log(data);
        // });
      }, 1000);
    }).then(function() {
      // clear / free reference
      el = window._protected_reference = undefined;
    });
  });

  el.click(); // open
}

function invertBackgroundColor() {
  let newColor;
  newColor = invertColor(canvasColor, true);
  let paint_icon = document.getElementById("paint");
  paint_icon.style.fill = canvasColor; // Changes the color of the brush icon's paint roll
  // let paint_brush = document.getElementById("brush"); // Did not like it very match..
  // paint_brush.style.fill= newColor; // Changes the color of the brush icon's handle
  color = canvasColor;
  canvasColor = newColor;
  pensize = PEN_SIZE;
  context.fillStyle = newColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  plots.forEach(plot => renderDoodle(plot));
}
