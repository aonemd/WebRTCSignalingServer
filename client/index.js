var name, connectedUser, yourConnection, stream;

var connection = new WebSocket('ws://localhost:3000');

var loginPage          = document.querySelector('#login-page');
var usernameInput      = document.querySelector('#username');
var loginButton        = document.querySelector('#login');
var callPage           = document.querySelector('#call-page');
var yourVideo          = document.querySelector('#yours');
var theirVideo         = document.querySelector('#theirs');
var theirUsernameInput = document.querySelector('#their-username');
var callButton         = document.querySelector('#call');
var hangUpButton       = document.querySelector('#hang-up');

callPage.style.display = 'none';

loginButton.addEventListener('click', function (event) {
  name = usernameInput.value;

  if (name.length > 0) {
    _send({
      type: 'login',
      name: name
    });
  }
});

callButton.addEventListener('click', function() {
  var theirUsername = theirUsernameInput.value;

  if (theirUsername.length > 0) {
    _startPeerConnection(theirUsername);
  }
});

hangUpButton.addEventListener('click', function () {
  _send({
    type: 'leave'
  })

  onLeave();
});

connection.onopen = function () {
  console.log("Connected");
};

connection.onmessage = function (message) {
  console.log('Got message', message.data);

  var data = JSON.parse(message.data);
  switch (data.type) {
    case 'login':
      onLogin(data.success);
      break;
    case 'offer':
      onOffer(data.offer, data.name);
      break;
    case 'answer':
      onAnswer(data.answer);
      break;
    case 'candidate':
      onCandidate(data.candidate);
      break;
    case 'leave':
      onLeave();
      break;
    default:
      break;
  }
};

connection.onerror = function (error) {
  console.log('Got error', error);
};

function onLogin(success) {
  if (success === false) {
    alert('Login unsuccessful. Please try a different username.');
  } else {
    loginPage.style.display = 'none';
    callPage.style.display  = 'block';

    _startConnection();
  }
};

function onOffer(offer, name) {
  connectedUser = name;

  yourConnection.setRemoteDescription(new RTCSessionDescription(offer));

  yourConnection.createAnswer(function (answer) {
    yourConnection.setLocalDescription(answer);
    _send({
      type: 'answer',
      answer: answer
    });
  }, function (error) {
    alert('An error has occurred.');
  });
}

function onAnswer(answer) {
  yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

function onCandidate(candidate) {
  yourConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function onLeave() {
  connectedUser        = null;
  theirVideo.srcObject = null;

  yourConnection.close();

  yourConnection.onicecandidate = null;
  yourConnection.onaddstream    = null;

  _setupPeerConnection(stream);
}

function _send(message) {
  if (connectedUser) {
    message.name = connectedUser;
  }

  connection.send(JSON.stringify(message));
};

function _startConnection() {
  if (_hasUserMedia()) {
    navigator.getUserMedia({ video: true, audio: false }, function (myStream) {
      stream              = myStream;
      yourVideo.srcObject = stream;

      if (_hasRTCPeerConnection()) {
        _setupPeerConnection(stream);
      } else {
        alert('Sorry, your browser does not support WebRTC.');
      }
    }, function (error) {
      console.log(error);
    });
  } else {
    alert('Sorry, your browser does not support WebRTC.');
  }
}

function _setupPeerConnection(stream) {
  var configuration = {
    "iceServers": [{ "url": "stun:stun.1.google.com:19302" }]
  };
  yourConnection = new RTCPeerConnection(configuration);

  // setup sttream listening
  yourConnection.addStream(stream);
  yourConnection.onaddstream = function (mediaStreamEvent) {
    theirVideo.srcObject = mediaStreamEvent.stream;
  };

  // setup ice handling
  yourConnection.onicecandidate = function (event) {
    if (event.candidate) {
      _send({
        type: 'candidate',
        candidate: event.candidate
      });
    }
  };
}

function _startPeerConnection(user) {
  connectedUser = user

  yourConnection.createOffer(function (offer) {
    _send({
      type: 'offer',
      offer: offer
    });

    yourConnection.setLocalDescription(offer);
  }, function (error) {
    alert('An error hsa occurred.');
  });
}

function _hasUserMedia() {
  navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  return !!navigator.getUserMedia;
}

function _hasRTCPeerConnection() {
  window.RTCPeerConnection     = window.RTCPeerConnection ||
    window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  window.RTCSessionDescription = window.RTCSessionDescription ||
    window.webkitRTCSessionDescription ||
    window.mozRTCSessionDescription;
  window.RTCIceCandidate       = window.RTCIceCandidate ||
    window.webkitRTCIceCandidate || window.mozRTCIceCandidate;

  return !!window.RTCPeerConnection;
}
