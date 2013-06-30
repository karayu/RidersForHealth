var map;
var directionsDisplay;
var directionsService;

var markers = {};
var lines =[];
var __defaults = {
  city_name: 'San Francisco',
  data_url: 'http://data.codeforamerica.org/OHHS/SF/1.2',
  center: [37.767745, -122.441475],
  mapquest_key: "Fmjtd|luua2q6and,aa=o5-hzb59"
};

Session.set("routes", undefined)
//
// Callback function for geocode results from Mapquest Open.
// http://open.mapquestapi.com/geocoding/
//
function onAddressFound(response)
{
  var center = response.results[0].locations[0].latLng;
  addDestination(center);

  showAllPoints();
}

// show all markers, and the destination, zoom out/in to fit

function showAllPoints(){


}

function addDestination(){


}


function numberToRadius  (number) {
  return number * Math.PI / 180;
}

// from http://www.movable-type.co.uk/scripts/latlong.html
function distanceBetween(pt1, pt2){

  var lon1 = pt1[0],
  lat1 = pt1[1],
  lon2 = pt2[0],
  lat2 = pt2[1],
  dLat = numberToRadius(lat2 - lat1),
  dLon = numberToRadius(lon2 - lon1),
  a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(numberToRadius(lat1))
    * Math.cos(numberToRadius(lat2)) * Math.pow(Math.sin(dLon / 2), 2),
  c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (6371 * c) * 1000; // returns meters
}



// Set up map, but don't set the view to anything.
//
function setupMap(element)
{


  directionsService = new google.maps.DirectionsService();

  directionsDisplay = new google.maps.DirectionsRenderer();
  var sf = new google.maps.LatLng(37.767745, -122.441475);
  var mapOptions = {
    zoom:18,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    center: sf,
    mapTypeControl:false,
    streetViewControl:false
  }
  map = new google.maps.Map(document.getElementById("map"), mapOptions);
  directionsDisplay.setMap(map);


  var mapBoxTypeOptions = {
    getTileUrl: function(coord, zoom) {
      subdomains = "abcd";
      return "http://"+subdomains[Math.floor(Math.random()*4)]+".tiles.mapbox.com/v3/dmt.map-f9qb0tnz/"+zoom+"/"+coord.x+"/"+coord.y+".png";
    },
    tileSize: new google.maps.Size(256, 256),
    maxZoom: 21,
    minZoom: 0,
    name: "mapbox"
  };

  var mapBoxMapType = new google.maps.ImageMapType(mapBoxTypeOptions);

  map.mapTypes.set('mapbox', mapBoxMapType);
  map.setMapTypeId('mapbox');

  Session.set("end", "155 9th. st sf")

  Deps.autorun(function (c) {
    var end = Session.get("end");
    Meteor.users.find().forEach(function (user) {
      
      if(!user.profile)
        user.profile = {};

      var imgUrl = "http://www.gravatar.com/avatar/";
      if(user.emails){
        if(user.emails[0].address)
          imgUrl += md5(user.emails[0].address);
      }else if(user.profile){
        if(user.profile.email){
          imgUrl += md5(user.profile.email);
        }
      }

      lat = user.profile.latitude || "37.76774";
      lng = user.profile.longitude || "-122.44147";
      
      if(shouldcalcRoute(lat+", "+lng, end, user)){
        markers[user._id] = new UserIcon(new google.maps.LatLng(lat, lng), imgUrl, map, "active");
        calcRoute(lat+", "+lng, end, user);
      }
      
    });
  });

  Deps.autorun(function (c) {
    var user = Meteor.user();
    if(user !== null){

      $("img#logo").attr("src", "meeteeyore_logo_small@2x.png");
      $("img#logo").addClass("pull-left");
      $("#subtitle").hide();
      $("img#logo").animate({"width": "150px", "padding": "0px 0px 20px 0px", "margin-top": "-16px"}, 500);
      $("#map").animate({"top": "80px"}, 500);
    }
  });


  $("form#addressentry").submit(function(e){
    e.preventDefault();
    Session.set("end", $("input#address").val());
    $("div.address").fadeOut("fast");
    $("div#routes").fadeIn("fast");
  });



}

Template.routes.time = function(){
  return Session.get("maxTime");  
}
Template.routes.userroutes = function(){
  return UserRoutes.find()
}


var colors = ["#ff0000", "#00ff00", "#0000ff"];
colorCount =0;

var directions = {};


lastStart = {};
lastEnd = {};


userColors = {};

function userColor(user){

  if(userColors[user._id])
    return userColors[user._id]
  else{
    return userColors[user._id] = colors[colorCount];
    colorCount+=1;
  }
}


function shouldcalcRoute(start, end, user){
  // figure out if we should update...
  
  if(lastEnd[user._id] !== end)
    return true;

  lat = start.split(",")[0]
  lng = start.split(",")[1]


  if(lastStart[user._id]){
    if(distanceBetween([lat, lng], [lastStart[user._id].split(",")[0], lastStart[user._id].split(",")[1]]) >500){ 
      return true
    }else{
      return false
    }
  }else{
    return true;
  }

}

var maxTime;




function calcRoute(start, end, user) {

  function renderDirections(result) {
    var directionsRenderer = new google.maps.DirectionsRenderer({polylineOptions: {strokeColor: userColor(user)},
                                                                 suppressMarkers: true});
    directionsRenderer.setMap(map);
    directionsRenderer.setDirections(result);

    console.log(result)
    
    user.profile.distance =result.routes[0].legs[0].distance.text;
    user.profile.duration =result.routes[0].legs[0].duration.text;


    if((!maxTime) ||(maxTime < result.routes[0].legs[0].duration.value)){
      maxTime = result.routes[0].legs[0].duration.value;
      Session.set("maxTime", result.routes[0].legs[0].duration.text)
    }

    userroute = user.profile
    userroute.userid = user._id

    foundRoute =  UserRoutes.find({userid:userroute.userid})
    if(foundRoute.fetch().length === 0)
      UserRoutes.insert(userroute)
    else
      UserRoutes.update(foundRoute._id, userroute)
    //Meteor.users.update(user._id, {$set: {distance: user.distance, duration: user.duration}});



    // set the start point that this route is based on.



    if(directions[user._id])
      directions[user._id].setMap(null);

    directions[user._id] = directionsRenderer;

  }

  if(!user.profile.transportationMode)
    user.profile = {transportationMode:"walking"};

  lastEnd[user._id] = end;
  lastStart[user._id] = start;
  
  var request = {
    origin:start,
    destination:end,
    travelMode: google.maps.TravelMode[user.profile.transportationMode.toUpperCase()]
  };
  directionsService.route(request, function(result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      renderDirections(result)
    }
  });

}

/*
 * JavaScript Pretty Date
 * Copyright (c) 2011 John Resig (ejohn.org)
 * Licensed under the MIT and GPL licenses.
 */

function prettyDate(time){
  var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
  diff = (((new Date()).getTime() - date.getTime()) / 1000),
  day_diff = Math.floor(diff / 86400);
  
  if ( isNaN(day_diff) || day_diff < 0 )
	return;
  
  return day_diff == 0 && (
	diff < 60 && "just now" ||
	  diff < 120 && "1 minute ago" ||
	  diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
	  diff < 7200 && "1 hour ago" ||
	  diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
	day_diff == 1 && "Yesterday" ||
	day_diff < 7 && day_diff + " days ago" ||
	day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago" ||
	day_diff < 730 && Math.ceil( day_diff / 30 ) + " months ago" ||
	day_diff > 730 && Math.floor( day_diff / 365 ) + " years ago";
}


$(function(){


  Template.map.rendered =  function(){
    setupMap('map');
    
  }
  

  $("#addressentry").on("submit", function(e){
    e.preventDefault();

    var url = "http://open.mapquestapi.com/geocoding/v1/address";

    var data = {outFormat:"json",
                inFormat:"kvp",
                key:__defaults.mapquest_key,
                boundingBox:"37.816,-122.536,37.693,-122.340",
                location:$("#address").val() + ', ' + __defaults.city_name};
    
    $.ajax(url, {data: data, dataType: 'jsonp', success: onAddressFound});

  });


  function initializeLocation() {

    // Try HTML5 geolocation
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var pos = new google.maps.LatLng(position.coords.latitude,
                                         position.coords.longitude);


        map.setCenter(pos);
      }, function() {
        handleNoGeolocation(true);
      });
    } else {
      // Browser doesn't support Geolocation
      handleNoGeolocation(false);
    }
  }

  function handleNoGeolocation(errorFlag) {
    if (errorFlag) {
      var content = 'Error: The Geolocation service failed.';
    } else {
      var content = 'Error: Your browser doesn\'t support geolocation.';
    }

    var options = {
      map: map,
      position: new google.maps.LatLng(60, 105),
      content: content
    };

    var infowindow = new google.maps.InfoWindow(options);
    map.setCenter(options.position);
  }

  initializeLocation();


});

function getDirections(from, to){

  url = "http://www.mapquestapi.com/directions/v1/route?key=Fmjtd%7Cluua2q6and%2Caa%3Do5-hzb59&shapeFormat=raw&generalize=0";
  
  $.ajax(url+"&ambiguities=ignore&outFormat=json&from="+encodeURIComponent(from)+"&to="+encodeURIComponent(to),
         {crossDomain:true,
          dataType:"jsonp",
          success:function(data){
            for(l in lines){
              //map.removeLayer(lines[l]);
            }
            directionsOnMap(data)
          }});
}

function directionsOnMap(data){

 /* latlngs = [];
  for(i =0; i <data.route.shape.shapePoints.length; i +=2){
    latlngs.push(new L.LatLng(data.route.shape.shapePoints[i], data.route.shape.shapePoints[i+1]));
  }
  lastpath = data.route.shape.shapePoints;
  start = data.route.locations[0].latLng
  // create a red polyline from an arrays of LatLng points
  line = new L.Polyline(latlngs, {color: 'blue'});
*/
  // zoom the map to the polyline
  //map.fitBounds(new L.LatLngBounds(latlngs));

  // add the polyline to the map
  //map.addLayer(line);
}











// USER ICON!!

function UserIcon(center, image, map, status) {

  // Now initialize all properties.
  this.center_ =center;
  this.image_ = image;
  this.map_ = map;
  this.size = 60;
  this.status = status;
  // We define a property to hold the image's
  // div. We'll actually create this div
  // upon receipt of the add() method so we'll
  // leave it null for now.
  this.div_ = null;

  // Explicitly call setMap() on this overlay
  this.setMap(map);
}

UserIcon.prototype = new google.maps.OverlayView();


UserIcon.prototype.setStatus = function(status){
  this.status = status;

  $(this.div_).find("img").removeClass("unknown active away");
  $(this.div_).find("img").addClass(status);
}

UserIcon.prototype.onAdd = function() {

  // Note: an overlay's receipt of onAdd() indicates that
  // the map's panes are now available for attaching
  // the overlay to the map via the DOM.

  // Create the DIV and set some basic attributes.
  var div = document.createElement('div');
  div.style.border = "none";
  div.style.borderWidth = "0px";
  div.style.position = "absolute";
  $(div).addClass("user-icon");

  // Create an IMG element and attach it to the DIV.
  var img = document.createElement("img");
  img.src = this.image_;
  img.style.width = this.size + "px";
  img.style.height = this.size + "px";
  $(img).addClass("img-circle");
  div.appendChild(img);

  // Set the overlay's div_ property to this DIV
  this.div_ = div;
  this.setStatus(this.status);

  // We add an overlay to a map via one of the map's panes.
  // We'll add this overlay to the overlayImage pane.
  var panes = this.getPanes();
  panes.overlayLayer.appendChild(div);
}

UserIcon.prototype.draw = function() {

  // Size and position the overlay. We use a southwest and northeast
  // position of the overlay to peg it to the correct position and size.
  // We need to retrieve the projection from this overlay to do this.
  var overlayProjection = this.getProjection();

  // Retrieve the southwest and northeast coordinates of this overlay
  // in latlngs and convert them to pixels coordinates.
  // We'll use these coordinates to resize the DIV.
  var loc = overlayProjection.fromLatLngToDivPixel(this.center_);


  // Resize the image's DIV to fit the indicated dimensions.
  var div = this.div_;
  div.style.left = loc.x-50 + 'px';
  div.style.top = loc.y-50 + 'px';
  div.style.width =  this.size+'px';  // this should be based on the zoom level..
  div.style.height =  this.size+'px';
}

UserIcon.prototype.onRemove = function() {
  this.div_.parentNode.removeChild(this.div_);
  this.div_ = null;
}

// Note that the visibility property must be a string enclosed in quotes
UserIcon.prototype.hide = function() {
  if (this.div_) {
    this.div_.style.visibility = "hidden";
  }
}

UserIcon.prototype.show = function() {
  if (this.div_) {
    this.div_.style.visibility = "visible";
  }
}

UserIcon.prototype.toggle = function() {
  if (this.div_) {
    if (this.div_.style.visibility == "hidden") {
      this.show();
    } else {
      this.hide();
    }
  }
}

UserIcon.prototype.toggleDOM = function() {
  if (this.getMap()) {
    this.setMap(null);
  } else {
    this.setMap(this.map_);
  }
}
