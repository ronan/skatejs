Skate.js
=======

A simple, flexible, responsive jQuery slideshow/tab library.

Requirements
------------

[jQuery](http://jquery.com/) (1.8 or higher)

[jQuery UI](http://jqueryui.com/) (1.9 or higher)

Usage
-----

    $('.simple-demo').skate(options);

Options
-------

    items: '>*',            // A selector to specify the slides.
    animate: 500,           // Animate between the items. Specify a time in ms or false for no animation.
    effect: 'slide',        // The animation effect.
    easing: 'swing',        // The animation easing. Default options include 'fade', 'slide' and 'swap'.
    width: '',              // The width of the slider. Automatically detected if not set.
    height: '',             // The height of the slider. Automatically detected if not set.
    resize: true,           // Automatically resize when the window is resized.
    start: 0,               // The index of the item to start on.
    loop: false,            // When we get to the end, go back to the start.
    continuous: false,      // Keep going infinitely when next or prev is called.
    updateURL: true,        // Update the URL with a URL fragment so that deep linking can occur.
    alignX: 'left',         // Where within the slideshow to align the current item

    rowWidth: 1000,         // Number of items per row. Set high so that it dosn't wrap by default.
    itemsVisible: 'auto',   // The number of items visible at once.

    swipe: true,            // Add swipe support for touch devices.

    controls: [],           // An array of contols

    prev: '«',              // The contents of the prev. button. Set to false for none.
    next: '»',              // The contents of the next button. Set to false for none.
    tabs: false,            // A selector to specify the tabs or false for none.
    pager: 'numbers',       // A selector to specify the pager or 'numbers' to generate a numeric pager.
    mediaautopause: true,   // Automatically pause HTML 5 media when a slide is deactivated.
    mediaautoplay: false,   // Automatically play HTML 5 media when a slide is deactivated.
    auto: false,            // The delay (in ms) between automatic rotation. False or 0 for no auto rotation.
    pause: true,            // Automatically pause on hover. Only useful when 'auto' is on.
    click: true,            // Activate an item when clicked.

