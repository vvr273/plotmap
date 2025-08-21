// Initialize map
var map = L.map('map').setView([16.5062, 80.6480], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var places = [];
var markers = [];
var routeLine = null;
var inputType = "coords"; // default

// Collapsible sidebar toggle
function toggleCollapse() {
  const mainContainer = document.getElementById("mainContainer");
  mainContainer.classList.toggle("collapsed");
  setTimeout(() => { map.invalidateSize(); }, 310);
}

// On page load, add 2 inputs
window.onload = () => {
  document.getElementById("collapsibleInputs").style.display = "block";
  addInput(); addInput();
};

function toggleInputType() {
  let toggle = document.getElementById("toggleInput");
  inputType = toggle.checked ? "places" : "coords";

  // Reset input fields
  document.getElementById("inputs").innerHTML = "";
  addInput(); addInput();
}

function addInput() {
  let container = document.getElementById("inputs");
  let div = document.createElement("div");
  div.classList.add("place-input");

  if (inputType === "coords") {
    div.innerHTML = `Lat: <input type="text" class="lat"> Lng: <input type="text" class="lng">`;
  } else {
    div.innerHTML = `Place: <input type="text" class="place">`;
  }
  container.appendChild(div);
}

async function drawRoute() {
  // Clear old markers & route
  markers.forEach(m => map.removeLayer(m));
  if (routeLine) map.removeLayer(routeLine);
  markers = [];
  places = [];

  let inputs = document.querySelectorAll(".place-input");

  for (let div of inputs) {
    if (inputType === "coords") {
      let lat = parseFloat(div.querySelector(".lat").value);
      let lng = parseFloat(div.querySelector(".lng").value);
      if (!isNaN(lat) && !isNaN(lng)) {
        places.push({name: `(${lat},${lng})`, coords: [lat, lng]});
      }
    } else {
      let name = div.querySelector(".place").value;
      if (name.trim() !== "") {
        let coords = await geocodePlace(name);
        if (coords) {
          places.push({name: name, coords: coords});
        }
      }
    }
  }

  // Add markers & polyline
  let latlngs = [];
  places.forEach(p => {
    let m = L.marker(p.coords).addTo(map).bindPopup(p.name);
    markers.push(m);
    latlngs.push(p.coords);
  });

  if (latlngs.length > 1) {
    routeLine = L.polyline(latlngs, {color: 'blue'}).addTo(map);
    map.fitBounds(routeLine.getBounds());
  }

  showDistances();
}

// Geocoding with Nominatim API
async function geocodePlace(name) {
  let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`;
  let res = await fetch(url);
  let data = await res.json();
  if (data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
}

// Haversine formula
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  let dLat = toRad(lat2 - lat1);
  let dLon = toRad(lon2 - lon1);
  let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(2);
}

// Show distances
function showDistances() {
  let infoDiv = document.getElementById("info");
  if (places.length < 2) {
    infoDiv.innerHTML = "Add at least 2 points.";
    return;
  }

  let output = "<b>Distances:</b><br>";
  let total = 0;
  for (let i = 0; i < places.length-1; i++) {
    let d = haversine(
      places[i].coords[0], places[i].coords[1],
      places[i+1].coords[0], places[i+1].coords[1]
    );
    total += parseFloat(d);
    output += `${places[i].name} → ${places[i+1].name} = ${d} km<br>`;
  }
  output += `<b>Total Distance: ${total.toFixed(2)} km</b>`;
  infoDiv.innerHTML = output;
}
// Clear all inputs and markers
function clearAll() {
  document.getElementById("inputs").innerHTML = "";
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  places = [];
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }
  document.getElementById("info").innerHTML = "";
  addInput(); addInput();
}