console.log("Hello world");
function menuToggle() {
  var x = document.getElementById("_navlinks");
  if (x.className === "navlinks") {
    x.className += " responsive";
  } else {
    x.className = "navlinks";
  }
}
