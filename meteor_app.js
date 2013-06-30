UserRoutes = new Meteor.Collection("userroutes");

if (Meteor.isClient) {
  Template.routes.users = function() {
    return Meteor.users.find();
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    UserRoutes.remove({})
    // code to run on server at startup
  });
}
