if (Meteor.isClient) {
  Template.dashboard.users = function() {
    return Meteor.users.find();
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
