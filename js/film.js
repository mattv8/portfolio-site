// Load the YouTube IFrame API script asynchronously
var tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Define a global variable to hold the YouTube player object
let player;

function openVideoModal(videoId) {
    var modal = document.getElementById("video-modal");
    var modalContent = document.querySelector(".modal-content");
    var film = document.getElementById("film");

    // Show the modal and center it on the page
    modal.style.display = "block";
    centerModal(modalContent);

    // Add the body-blur class to the body element to blur the content behind the modal
    film.classList.add("body-blur");

    // Create the YouTube player object if it doesn't exist yet
    if (!player) {
        player = new YT.Player('player', {
            height: '100%',
            width: '95%',
            videoId: videoId,
            events: {
                'onReady': onPlayerReady
            }
        });
    } else {
        // Load a new video into the existing player object
        player.loadVideoById(videoId);
    }
}

function onPlayerReady(event) {
    // Play the video when the player is ready
    event.target.playVideo();
}

function closeVideoModal() {
    var modal = document.getElementById("video-modal");
    var film = document.getElementById("film");

    // Hide the modal
    modal.style.display = "none";

    // Remove the body-blur class from the body element
    film.classList.remove("body-blur");

    // Stop the video
    player.stopVideo();
}


function centerModal(modalContent) {
    var pageWidth = window.innerWidth;
    var pageHeight = window.innerHeight;
    var modalWidth = modalContent.offsetWidth;
    var modalHeight = modalContent.offsetHeight;
    modalContent.style.left = (pageWidth - modalWidth) / 2 + "px";
    modalContent.style.top = (pageHeight - modalHeight) / 2 + "px";
}
