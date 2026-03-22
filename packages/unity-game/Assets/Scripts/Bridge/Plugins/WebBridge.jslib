mergeInto(LibraryManager.library, {
  SendToReact: function(messagePtr) {
    var message = UTF8ToString(messagePtr);
    if (window.dispatchUnityMessage) {
      window.dispatchUnityMessage(message);
    }
  },
});
