var map;
var directionsDisplay;
var directionsService;

var markers = {};
var lines =[];
var __defaults = {
  city_name: 'San Francisco',
  center: [37.767745, -122.441475]
};

Session.set("routes", undefined)


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

  Session.set("end", undefined)

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

      if((end !== undefined) && (shouldcalcRoute(lat+", "+lng, end, user.profile.transportationMode, user))){
        if(markers[user._id] !== undefined)
          markers[user_.id].setPosition(new google.maps.LatLng(lat, lng))
        else
          markers[user._id] = new UserIcon(new google.maps.LatLng(lat, lng), imgUrl, map, "active", user);
        calcRoute(lat+", "+lng, end, user);
      }




      foundRoute =  UserRoutes.find({userid:user._id}).fetch()
      if(foundRoute.length === 0){
        userroute = user.profile
        userroute.userid = user._id
        userroute.color = userColor(user);

        UserRoutes.insert(userroute)
      }else{

        ur = foundRoute[0]
        for(k in user.profile){
          ur[k] = user.profile[k];
        }
        UserRoutes.update(ur._id, ur)


      }


    });
  });


  var justloggedin = false;

  Deps.autorun(function (c) {
    var user = Meteor.user();
    if(user !== null){

      if(!justloggedin){
        $("div.address").fadeIn("fast");
        justloggedin = true;
      }
        
        

      $("img#logo").attr("src", "meeteeyore_logo_small@2x.png");
      $("img#logo").addClass("pull-left");
      $("#subtitle").hide();
      $("img#logo").animate({"width": "150px", "padding": "0px 0px 20px 0px", "margin-top": "-16px"}, 500);
      $("#map").animate({"top": "80px"}, 500);

      function rotate(degree) {
          $elRotate.css({ WebkitTransform: 'rotate(' + degree + 'deg)'});
          $elRotate.css({ '-moz-transform': 'rotate(' + degree + 'deg)'});
      }
      if((user.profile !== undefined )&&(user.profile.trueHeading != undefined)){
        var $elRotate = $('.'+ user._id), degree = user.profile.trueHeading;
        if ($elRotate.length !== 0) {
          rotate(degree);
        }
      }
    }else{
      $("div.address").hide();
      justloggedin = false;

      $("img#logo").attr("src", "welcome_eeyore@2x.png");
      $("img#logo").removeClass("pull-left");
      $("#subtitle").show();
      $("img#logo").animate({"width": "350px", "padding": "30px 0px 0px 0px", "margin-top": "0px"}, 500);
      $("#map").animate({"top": "270px"}, 500);


    }


  });

  Session.set("showroutes", "none");
  $("form#addressentry").submit(function(e){
    e.preventDefault();
    Session.set("end", $("input#address").val());


    geocoder = new google.maps.Geocoder();
    geocoder.geocode( { 'address': $("input#address").val()}, function(results, status) {

      if (status == google.maps.GeocoderStatus.OK) {
        var image = {
          url: 'marker_@1x.png',
          // This marker is 20 pixels wide by 32 pixels tall.
          size: new google.maps.Size(39, 63),
          // The origin for this image is 0,0.
          origin: new google.maps.Point(0,0),
          // The anchor for this image is the base of the flagpole at 0,32.
          anchor: new google.maps.Point(0, 63)
        };
        if(endMarker != undefined)
          endMarker.setMap(null);

        var infowindow = new google.maps.InfoWindow({
            content: "<div class='destination'>" + results[0].formatted_address + "<br /><a href='#'>Change destination</a></div>"
        });


        endMarker = new google.maps.Marker({
          position: results[0].geometry.location,
          map: map,
          icon: image
        });
        google.maps.event.addListener(endMarker, 'click', function() {
          infowindow.open(map,endMarker);
          $("div.destination a").click(function(e){
            e.preventDefault();
            $("img#logo").click();
          })

        });
      }
    });


    $("div.address").fadeOut("fast");
    $("div#routes").fadeIn("fast");
    Session.set("showroutes", "block");
  });

  $("img#logo").click(function(e){
    e.preventDefault();
    $("div.address").fadeIn("fast");
    $("div#routes").fadeOut("fast");
    Session.set("showroutes", "none");
    Session.set("end", undefined);
  })


}

Template.routes.time = function(){
  var urs = UserRoutes.find({}).fetch()
  var maxTime
  var ur
  for(u in urs){
    if((!maxTime) ||(maxTime < urs[u].durationValue)){
      maxTime = urs[u].durationValue
      ur = urs[u];
    }
  }
  if(ur !== undefined)
    return ur.durationNumber;

  return "";

}
Template.routes.timeLabel = function(){
  var urs = UserRoutes.find({}).fetch()
  var maxTime
  var ur
  for(u in urs){
    if((!maxTime) ||(maxTime < urs[u].durationValue)){
      maxTime = urs[u].durationValue
      ur = urs[u];
    }
  }
  if(ur !== undefined)
    return ur.durationLabel;

  return "";
}

Template.routes.userroutes = function(){
//  debugger
  var userroutes  =UserRoutes.find({})
  return userroutes;
}
Template.routes.showroutes = function(){
  return Session.get("showroutes")
}

var endMarker
var colors = ["#6ACAC3", "#4796EF", "#f7aa4e", "#F59331", "#ec008c", "#fff200"];
colorCount =0;

var directions = {};


lastStart = {};
lastEnd = {};
lastMode = {};

userColors = {};

function userColor(user){

  if(userColors[user._id])
    return userColors[user._id]
  else{
    color = userColors[user._id] = colors[colorCount];
    colorCount+=1;
    return color;
  }
}


function shouldcalcRoute(start, end, mode, user){
  // figure out if we should update...

  if(lastEnd[user._id] !== end)
    return true;

  if(lastMode[user._id] !== mode)
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

    
    var imgUrl = "http://www.gravatar.com/avatar/";
    if(user.emails){
      if(user.emails[0].address)
        imgUrl += md5(user.emails[0].address);
    }else if(user.profile){
      if(user.profile.email){
        imgUrl += md5(user.profile.email);
      }
    }



    foundRoute =  UserRoutes.find({userid:user._id}).fetch()
    if(foundRoute.length === 0){
      userroute = user.profile
      userroute.userid = user._id;
      userroute.distance =result.routes[0].legs[0].distance.text;
      userroute.durationNumber =result.routes[0].legs[0].duration.text.split(" ")[0];
      userroute.durationLabel =result.routes[0].legs[0].duration.text.split(" ")[1];
      userroute.durationValue =result.routes[0].legs[0].duration.value;
      userroute.imageUrl = imgUrl;
      userroute.color = userColor(user);

      UserRoutes.insert(userroute)
    }else{
      userroute = foundRoute[0];
      userroute.distance =result.routes[0].legs[0].distance.text;
      userroute.durationNumber =result.routes[0].legs[0].duration.text.split(" ")[0];
      userroute.durationLabel =result.routes[0].legs[0].duration.text.split(" ")[1];
      userroute.durationValue =result.routes[0].legs[0].duration.value;
      userroute.imageUrl = imgUrl;
      userroute.color = userColor(user);
      UserRoutes.update(userroute._id, userroute)
    }




    if(directions[user._id])
      directions[user._id].setMap(null);

    directions[user._id] = directionsRenderer;

  }

  if(!user.profile.transportationMode)
    user.profile = {transportationMode:"walking"};

  lastEnd[user._id] = end;
  lastStart[user._id] = start;
  lastMode[user._id] = user.profile.transportationMode;

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

Template.map.rendered =  function(){
  setupMap('map');  
}


$(function(){



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









// USER ICON!!
function UserIcon(center, image, map, status, user) {

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
  this.user = user;
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

  var arrow = document.createElement('div');
  arrow.style.position = "absolute";
  $(arrow).addClass("arrow-up");
  $(arrow).addClass(this.user._id);
  div.appendChild(arrow);

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
