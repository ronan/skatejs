/**
 * jQuery Skate
 *
 * A versitile, adaptive slideshow widget.
 *
 * Copyright (c) 2010-2014 Ronan Dowling
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 */

(function( $, undefined ) {
  $.skate = {count: 0};
  $.widget("ui.skate", {
    version: "0.1",
    widgetEventPrefix: 'skate',
    options: {
      items: '>*',                                            // A selector to specify the slides.
      animate: 500,                                           // Animate between the items. Specify a time in ms or false for no animation.
      effect: 'slide',                                        // The animation effect.
      easing: 'swing',                                        // The animation easing.
      width: '',                                              // The width of the slider. Automatically detected if not set.
      height: '',                                             // The height of the slider. Automatically detected if not set.
      auto: false,                                            // The delay (in ms) between automatic rotation. False or 0 for no auto rotation.
      pause: true,                                            // Automatically pause on hover. Only useful when 'auto' is on.
      resize: true,                                           // Automatically resize when the window is resized.
      click: true,                                            // Activate an item when clicked.
      start: 0,                                               // The index of the item to start on.
      loop: false,                                            // When we get to the end, go back to the start.
      mediaautopause: true,                                   // Automatically pause HTML 5 media when a slide is deactivated.
      mediaautoplay: false,                                   // Automatically play HTML 5 media when a slide is deactivated.
      continuous: false,                                      // Keep going infinitely when next or prev is called.
      updateURL: true,                                        // Update the URL with a URL fragment so that deep linking can occur.
      alignX: 'left',                                         // Where within the slideshow to align the current item

      rowWidth: 1000,                                         // Number of items per row. Set high so that it dosn't wrap by default.
      itemsVisible: 'auto',                                   // The number of items visible at once.

      swipe: true,                                            // Add swipe support for touch devices.

      controls: [],                                           // An array of contols

      // Some control shortcuts
      prev: '«',                                              // The contents of the prev. button. Set to false for none.
      next: '»',                                              // The contents of the next button. Set to false for none.
      tabs: false,                                            // A selector to specify the tabs or false for none.
      pager: 'numbers',                                       // A selector to specify the pager or 'numbers' to generate a numeric pager.


      // callbacks
      activate: null,                                         // Called when the widget is activated.
      afterInitialize: null,                                  // Called after initialization
      beforeActivate: null,                                   // Called at the start of initialization.
      beforeLoad: null,                                       // Called before the load
      load: null,
      hash: null,                                             // An optional callback to generate the url hash for a given item.
      itemActivate: null                                      // Called when a slide is activated.
    },

    _create: function() {
      this._initAll();
    },
    _init: function() {
      this._resize();
    },
    destroy: function () {
      this.element
        .removeClass(this.widgetBaseClass + " " + this.widgetBaseClass + "-disabled")
        .removeData("skate");

      for ( var i = this.items.length - 1; i >= 0; i-- )
        this.items[i].item.removeClass(this.widgetBaseClass + "-item");
    },
    _initAll: function() {
      this.element.addClass(this.widgetBaseClass);
      this.element.data('skate', this);
      this.items_index = {};
      this.hash_index = {};
      this.current  = {item: null, index: -1},
      this.previous = {item: null, index: -1},

      this._initItems();
      this._initIndices();
      this._initWrappers();
      this._initEffects();
      this._initControls();
      this._initHash();

      this._trigger('initialize', null);

      this._start({animate: false, bubbleUp: true, updateURL: false});
    },

    _initControls: function() {
      var o = this.options;
      var self = this;
      var defaults = {
        position: 'after',
        widget_class: 'skate-control',
        parent: null // This choses the widget element itself.
      };

      this.controls = [];

      // Add some controls for the shorcuts
      if (o.pager == 'numbers') {
        o.controls.push({type: 'pager'});
      }
      if (o.tabs) {
        o.controls.push($.extend({type: 'tabs'}, {selector: o.tabs}));
      }
      if (o.prev) {
        o.controls.push($.extend({type: 'prev'}, {text: o.prev}));
      }
      if (o.next) {
        o.controls.push($.extend({type: 'next'}, {text: o.next}));
      }
      if (o.auto && o.auto > 0) {
        o.controls.push($.extend({type: 'autoadvance'}, {timeout: o.auto, pause: o.pause}));
      }
      if (o.swipe) {
        o.controls.push($.extend({type: 'swipe'}, {}));
      }
      if (o.click) {
        o.controls.push($.extend({type: 'click'}, {}));
      }
      if (o.mediaautoplay || o.mediaautopause) {
        o.controls.push($.extend({type: 'mediacontrol'}, {autoplay: o.mediaautoplay, autopause: o.mediaautopause}));
      }

      // Create new widgets for all the controls.
      for (var i in o.controls) {
        var opt = $.extend({}, defaults, o.controls[i]);

        // Not all controls need added markup but since they're all ui widgets we have to apply them to something.
        var control = $('<div></div>').addClass(opt.widget_class).addClass(opt.widget_class + '-' + opt.type);
        var widget = 'skatecontrol_' + opt.type;

        if ($.ui[widget]) {
          // Look at this line! Holy syntax, Batman!
          $(control)[widget]($.extend({}, opt, {skate: this}));
        }
      }
    },   
    _initEffects: function() {
      var o = this.options;
      var self = this;
      this.effects = [];
      if (typeof o.effect == 'string' && $.skate.effects[o.effect]) {
        this.effects.push($.skate.effects[o.effect]);
      }
      for (var i in this.effects) {
        this.effects[i].initialize(this);
      }
    },
    _offset: function() {
      this.element.offset()
    },
    _initHash: function() {
      var self = this;
      // Set up the hash change event to react to the back/forward button.
      if (this.options.updateURL) {
        $(window).bind('hashchange', function() {
          self._start({bubbleUp: true});
        });
      }

      // Prevent anchor links from causing the mask to scroll (overflow hidden items scroll with anchor links).
      // @TODO: make this work for links in the format href="path/to/current/page#anchor"
      // @TODO: add back the hashchange to allow deep linking within tabs (compatible with the tabs themselves).
      $('a[href^="#"]').each(function() {
        var link = this;
        $(link).click(function (event) {
          var locationHref = window.location.href;
          var elementClick = $(link).attr("href");
          if ($(elementClick).length) {
            event.preventDefault()
            var destination = $(elementClick).offset().top;
            $("html:not(:animated),body:not(:animated)").animate({scrollTop: destination}, 0);
          }
        });
      });
    },
    _initItems: function() {
      this.items = $(this.options.items, this.element).data('skate', this).addClass(this.widgetBaseClass + '-item');
    },
    _initIndices: function() {
      var self = this;
      self.items_index = {};
      self.hash_index = {};
      this.skateid = ++$.skate.count;
      this.items.each(function(index, item) {
        var hash = '#' + self.generateHash(item, index);
        self.items_index[hash] = $(item);
        self.hash_index[index] = hash;
      });
    },
    _initWrappers: function() {
      var skate = this, parent = skate.items.parent(), o = skate.options;

      skate.mask        = $('<div class="' + skate.widgetBaseClass + '-mask">').css({position: 'relative', overflow: 'hidden'})
      skate.wrapper     = $('<div class="' + skate.widgetBaseClass + '-wrapper">').append(skate.items);
      skate.mask.append(skate.wrapper);
      parent.append(skate.mask);

      if (o.resize) {
        $(window).resize(function() {skate._resize()});
      }

      skate._resize();
    },
    _height: function() {
      var h = 0;
      var items = this._visibleItems();

      items.each(function(i, item) {
        h = Math.max(h, $(item).height());
      });

      return h;
    },
    _width: function() {
      return this.element.width();
    },
    _visibleItems: function() {
      var current = this.currentIndex();
      if (current < 0) {
        current = this.options.start;
      }
      return this.items.slice(current, current + this.itemsVisible);
    },
    _resize: function() {
      for (var i in this.effects) {
        this.effects[i].resize(this);
      }
      //this.activate(this.current.item, $.extend({}, this.options, {animate: false, bubbleUp: false, updateURL: false}));
    },
    _start: function(options) {
      var o = $.extend({}, this.options, options);

      var self = this;
      // If there's a hash sent by the browser activate that tab.
      var index = self.getHashIndex();
      // Otherwise get the specified start index or 0.
      if (index == -1) {
        index = parseInt(o.start) || 0;
      }
      if (index != this.current.index) {
        this.activate(index, o);
      }

      // Resize when the current image loads in case there is no height/width set in html.
      var that = this;
      this.getItems().find('img').bind('load', function() {that._resize()});
    },

    activate: function(item, options) {
      var item, index;
      var o = $.extend({}, this.options, options);

      // We can activate with a jQuery element, a DOM item or an index.
      if (typeof item === 'number') {
        index = item;
        item = this.items.eq(index);
      }
      else {
        item = $(item);
        index = item.index();
      }

      if (index !== this.current.index && item.hasClass('' + this.widgetBaseClass + '-item')) {
        if (!item.hasClass('' + this.widgetBaseClass + '-active')) {
          // Set the active class on the current tab and panel.
          item.siblings().removeClass('' + this.widgetBaseClass + '-active').addClass('' + this.widgetBaseClass + '-inactive');
          item.addClass('' + this.widgetBaseClass + '-active').removeClass('' + this.widgetBaseClass + '-inactive');
        }

        // Mark the current item.
        this.previous = this.current;
        this.current = {
          item: item,
          index: index
        }

        // Activate all ancestor slides/tab.
        if (o.bubbleUp) {
          this.bubbleUp();
        }
        // Start the activation effects.
        for (var i in this.effects) {
          this.effects[i].activate(this, this.current, this.previous, o);
        }

        // Update the browser hash.
        hash = this.hash_index[index];
        if (o.updateURL) {
          var pos = $(window).scrollTop();
          this.setHash(hash);
          $(window).scrollTop(pos);
        }

        this._trigger('activate', null, {current: this.current, previous: this.previous, options: o});
      }
    },
    next: function() {
      var next = this.getNextItem();
      this.activate(next);
    },
    prev: function() {
      var prev = this.getPrevItem();
      this.activate(prev);
    },
    go: function(i) {
      this.activate(i);
    },
    currentIndex: function() {
      return this.current && this.current.index != undefined ? this.current.index : 0;
    },
    getItems: function() {
      return this.items;
    },
    getItem: function(i) {
      var items = this.getItems();
      if (items[i] != undefined) {
        return items[i];
      } 
    },
    getItemCount: function() {
      return this.items.length;
    },
    getNextItem: function() {
      var index = this.currentIndex() + 1;
      var next = this.items.eq(index);

      // Make sure we're not scrolling past the last visible item.
      if (index > this.items.length) {
        next = [];
      }
      // Loop if needed.
      if (next.length == 0 && this.options && this.options.loop) {
        next = this.items.eq(0);
      }
      return next;
    },
    getPrevItem: function() {
      var prev = this.items.filter('.' + this.widgetBaseClass + '-active').prev();
      if (prev.length == 0 && this.options && this.options.loop) {
        prev = this.items.eq(this.items.length - 1);
      }
      return prev;
    },
    bubbleUp: function() {
      this.element.parents('.' + this.widgetBaseClass + '-item').each(function() {
        if (slides = $(this).data('skate')) {
          slides.activate(this, {animate: false});
        }
      });
    },
    setHash: function(hash) {
      hash = hash.replace('#', '');
      var hashes = window.location.hash ? window.location.hash.replace('#', '').split('&') : [];
      for (i in hashes) {
        if (this.items_index['#' + hashes[i]]) {
          hashes[i] = hash;
          window.location.hash = hashes.join('&');
          return;
        }
      }
      // If no matching hash was found to replace.
      hashes.push(hash);
      window.location.hash = hashes.join('&');
    },
    getHash: function() {
      var hashes = window.location.hash.replace('#', '').split('&');
      for (i in hashes) {
        if (this.items_index['#' + hashes[i]]) {
          return '#' + hashes[i];
        }
      }
      return null;
    },
    getHashItem: function() {
      return $(this.items_index[this.getHash()]);
    },
    getHashIndex: function() {
      return this.getHashItem().index();
    },
    anim: function(t, fx) {
    },
    generateHash: function(item, index) {
      if (this.options.hash) {
        return this.options.hash(item, index);
      }
      return this.skateid + '-' + (index + 1);
    }
  });

  // Define the default effects.
  $.skate.effects = {};
  $.skate.effect = {
    initialize: function(skate) {},
    resize: function(skate) {},
    activate: function(skate, item, previous) {},
    destroy: function(skate) {}
  };
  $.skate.effects.slide = $.extend({}, $.skate.effect, {
    initialize: function(skate) {
      var o = skate.options;
      this.resize(skate)
    },
    resize: function(skate) {
      var o = skate.options;

      skate.wrapper.css({'height': '', 'width': '', 'position': ''});
      skate.mask.css({'height': '', 'width': '', 'position': ''});
      skate.items.css({'float': '', 'width': ''});

      skate.width = o.width  ? o.width : skate._width();
      if (o.maskWidth) {
        skate.mask.css('width', o.maskWidth);
      }
      skate.maskWidth = skate.mask.width();
      skate.itemWidth = skate.items.eq(0).width();
      skate.itemsVisible = o.itemsVisible == 'auto' ? Math.max(1, Math.floor(skate.maskWidth/skate.itemWidth)) : o.itemsVisible;

      skate.items.css('float', 'left');

      // This is incompatible with variable width items. Might be needed in other circumstances.
      skate.items.css('width', skate.itemWidth);

      skate.wrapper.css({position: 'absolute', 'height': skate.height, 'width': skate.width * Math.min(o.rowWidth, skate.items.length)});
      skate.mask.css({position: 'relative', overflow: 'hidden'});

      skate.height = o.height ? o.height : skate._height();

      skate.wrapper.css('height', skate.height);
      skate.mask.css('height', skate.height);

      if (skate.current.index >= 0) {
        this.activate(skate, skate.current, skate.previous, {animate: false});
      }
    },
    activate: function(skate, item, previous, o) {
      var func = o.animate ? 'animate' : 'css';
      var items = skate.getItems();

      // Resize the height and left pos
      var scrolltoIdx = item.index;

      // Attempt to keep the active in the middle (if multiple are visible)
      if (skate.itemsVisible && skate.itemsVisible > 1) {
        scrolltoIdx -= Math.floor(skate.itemsVisible/2);
        var max = items.length - skate.itemsVisible, min = 0;
        scrolltoIdx = Math.max(min, Math.min(max, scrolltoIdx));
      }

      // Resize the height and left pos
      var position = $(items[scrolltoIdx]).position();
      var itemwidth = item.item.width();

      var itemwidth = item.item.width();
      // Adjust the position for non top-left alignment.
      if (o.alignX == 'center') {
        position.left -= (skate._width() / 2) - (itemwidth / 2);
      }
      if (o.alignX == 'right') {
        position.left -= skate._width() - itemwidth;
      }

      skate.wrapper.stop()[func](
        {
          left: -position.left,
          top: -position.top
        },
        {
          duration: o.duration,
          easing: o.easing
        });
      skate.mask.stop()[func](
        {
          height: skate._height()
        },
        {
          duration: o.duration,
          easing: o.easing
        });

    }
  });
  $.skate.effects.swap = $.extend({}, $.skate.effect, {
    initialize: function(skate) {
      var o = skate.options;

      skate.items.css('position', 'absolute').hide();
      skate.itemsVisible = 1;
    },
    resize: function(skate) {
      var o = skate.options;

      skate.width = o.width  ? o.width : skate._width();
      if (o.maskWidth) {
        skate.mask.css('width', o.maskWidth);
      }
      skate.maskWidth = skate.mask.width();
      skate.itemWidth = skate.items.eq(0).width();

      skate.mask.css({position: 'relative', overflow: 'hidden'});

      skate.height = o.height ? o.height : skate._height();

      skate.mask.css('height', skate.height);
    },
    activate: function(skate, current, previous, o) {
      if (current.item) {      
        current.item.show();
      }
      if (previous.item) {
        previous.item.hide();
      }
    }
  });
  $.skate.effects.fade = $.extend({}, $.skate.effects.swap, {
    activate: function(skate, current, previous, o) {
      if (current.item) {
        o.animate > 0 ? current.item.fadeIn(parseInt(o.animate)) : current.item.show();
      }
      if (previous.item) {
        o.animate > 0 ? previous.item.fadeOut(parseInt(o.animate)) : previous.item.hide();
      }
    }
  });



  // Add the controler widgets types. These widgets are not indteded to be created except in conjunction with a skate object.
  $.widget("ui.skatecontrol", {
    version: "0.1",
    widgetEventPrefix: 'skatecontrol',
    options: {
      skate: null                      // The skate object that this controls.
    },
    parent: null,

    _create: function() {
      $(this.element).addClass('skatecontrol').addClass(this.widgetBaseClass);

      // Trigger the various setoption logic.
      this._setOptions(this.options);
    },
    _initialize: function() {

    },
    destroy: function() {
      $(this.element).removeClass('skatecontrol');
    },
    _setOption: function(key, value) {
      var fn = '_setOption_' + key;
      if ($.isFunction(this[fn])) {
        this[fn](value);
      }
    },
    _setOption_skate: function(skate) {
      // If a new skate object is passed in we must rebuild.
      this.skate = skate;
      this.destroy();
      this._initialize();

      var self = this;
      $(skate.element).bind('skateactivate', function(e) {self.skatechange(e)});
      this.attach();
      this.refresh();
    },
    attach: function() {
      var opt = this.options;

      // Place this control at the top or bottom of the specified parent element.
      this.parent = (opt.parent == null ? $(this.skate.element) : $(opt.parent, this.skate.element));
      if (opt.position == 'after') {
        $(this.parent).append(this.element);
      }
      if (opt.position == 'before') {
        $(this.parent).prepend(this.element);
      }
    },
    skatechange: function(e) {
      this.refresh();
    },
    refresh: function() {
      // To be overriden. Update the controls to reflect the state of the Skate slideshow.
    }
  });

  // Add a set of tabs to the slider.
  $.widget("ui.skatecontrol_tabs", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {
      selector: '.tab',
      tabs: null,
      clone: false,
      move: false,
      preventdefault: true
    }),
    links: null,
    linkBaseClass: 'tab',

    refresh: function() {
      var i = this.options.skate.currentIndex();
      if (this.links && this.options && this.options.skate && this.parent) {
        this.links.removeClass(this.widgetBaseClass + '-active').removeClass('skate-active');
        this.links.filter('.' + this.widgetBaseClass + '-' + this.linkBaseClass + '-' + i).addClass(this.widgetBaseClass + '-active').addClass('skate-active');
      }
    },
     _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);
      var items = skate.getItems();
      var self = this;

      if (!this.links) {
        this.links = $(this.options.selector, skate.element);
      }
      this.links.each(function(i, item) {
        var hash = skate.generateHash(items[i], i);
        var item = self.options.clone ? $(item).clone() : $(item);
        item
           .addClass(self.widgetBaseClass + '-' + self.linkBaseClass)
           .addClass(self.widgetBaseClass + '-' + self.linkBaseClass + '-' + i)
           .addClass(self.widgetBaseClass + '-' + self.linkBaseClass + '-' + hash)
           .click(function(e) {
                skate.go(i); 
                if (self.options.preventdefault) {
                  e.preventDefault();
                }
              });

        if (self.options.clone || self.options.move) {
          $(self.element).append(item);
        }
      });

      this.attach();

      // Grab the links after the attachment because they may have been cloned at that time.
      if (this.options.clone) {
        this.links = this.parent.children('.' + this.widgetBaseClass).children();
      }

      this.refresh();
    }
  });

  // A pager widget. Similar to tabs but numbered.
  $.widget("ui.skatecontrol_pager", $.ui.skatecontrol_tabs, {
    options: $.extend({}, $.ui.skatecontrol_tabs.prototype.options, {
      selector: ''
    }),
    links: null,
    linkBaseClass: 'pager-link',

    _setOption_skate: function(skate) {
      var items = skate.getItems();
      this.links = $();

      var self = this;
      // Build a list of numbered links.
      for (var i = 1; i <= items.length; i++) {
        (function (index) {
          self.links = self.links.add($('<a href="#' + index + '">' + index + '</a>'));
        })(i);
      }
      // Pager items always have to be 'cloned' since they do not exist in the dom already.
      this.options.clone = true;

      // Treat the newly created links as normal tabs.
      $.ui.skatecontrol_tabs.prototype._setOption_skate.apply(this, arguments);
    }
  });

  // A previous or next button.
  $.widget("ui.skatecontrol_prevnext", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {}),
    link: null,

    refresh: function() {
      if (this.options && this.options.skate && this.link) {
        var fn = this.options.dir == 'prev' ? 'getPrevItem' : 'getNextItem';
        if (this.options.skate[fn]().length) {
          this.link.removeClass('disabled');
        } else {
          this.link.addClass('disabled');
        }
        // Mark the link as unneeded if you can see all the items already.
        if (this.options.skate.getItems().length <= this.options.skate.itemsVisible) {
          this.link.addClass('unneeded');
        }
      }
    },
    _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);
      var fn = this.options.dir, skate = this.options.skate;

      this.link = $('<a class="' + this.widgetBaseClass + '-pager-' + this.options.dir + '">' + this.options.text + '</a>')
        .click(function(e) {
          skate[fn]();
          e.preventDefault();
        });
      $(this.element).append(this.link);
      this.attach();
      this.refresh();
    }
  });
  $.widget("ui.skatecontrol_prev", $.ui.skatecontrol_prevnext, {
    options: $.extend({}, $.ui.skatecontrol_prevnext.prototype.options, {
      dir: 'prev',
      text: '«'
    })
  });
  $.widget("ui.skatecontrol_next", $.ui.skatecontrol_prevnext, {
    options: $.extend({}, $.ui.skatecontrol_prevnext.prototype.options, {
      dir: 'next',
      text: '»'
    })
  });

  // A touch-based swipe control.
  $.widget("ui.skatecontrol_swipe", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {}),
    link: null,

    _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);
      var self = this;

      // Support touchwipe, swipe or Hammer.js if available.
      if (typeof skate.getItems().touchwipe != 'undefined') {
        skate.getItems().touchwipe({
           wipeLeft: function(e){skate.next(); return false;},
           wipeRight: function(e){skate.prev(); return false;},
           preventDefaultEvents: false
        });
      }
      else if (typeof $().swipe != 'undefined') {
        skate.element.swipe({
           swipeLeft: function(e){
            skate.next(); 
          },
           swipeRight: function(e){
            skate.prev();
          },
          threshold: 50
        });
      }
      else if (typeof Hammer != 'undefined') {
        Hammer(skate.element.get(0)).on('swipeleft', function (e) {
          e.stopPropagation();
          skate.next(); 
        });
        Hammer(skate.element.get(0)).on('swiperight', function (e) {
          e.stopPropagation();
          skate.prev(); 
        });
      }
    }
  });

  // A control to automatically advance the slideshow after a set period.
  $.widget("ui.skatecontrol_autoadvance", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {
      timeout: 5000,
      pause: true
    }),
    link: null,
    interval: null,
    paused: false,

    _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);

      var self = this;
      this.paused = false;

      if (this.options.pause) {
        this.element.hover(
          function() {self.paused = true},
          function() {self.paused = false}
        );
      }
    },
    skatechange: function() {
      this.refresh();
      // Restart the timer if the user has clicked next.
      this._start();
    },
    _start: function() {
      var self = this;

      // Clear the old interval if there is one.
      if (this.interval) {
        clearInterval(this.interval);
      }
      this.interval = setInterval(function() {
        if (!self.paused) {
          self.skate.next();
        }
      }, this.options.timeout);
    }
  });

  // Advance the slideshow when the current item is clicked.
  $.widget("ui.skatecontrol_click", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {
      preventdefault: false
    }),

    _setOption_skate: function(skate) {
      $.ui.skatecontrol.prototype._setOption_skate.apply(this, arguments);
      skate.getItems().each(function(i) {
        $(this).click(function(e) {
          if (skate.itemsVisible > 1 && skate.current.index !== i) {
            skate.go(i);
          }
        });
      });
    },
  });

  // Add a current/total count.
  $.widget("ui.skatecontrol_count", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {
      text: '%current/%total'
    }),

    refresh: function() {
      var text = this.options.text;
      text = text.replace('%current', this.options.skate.currentIndex() + 1);
      text = text.replace('%total', this.options.skate.getItemCount());

      $(this.element).html(text);
    }
  });

  // Automatically start and pause audio and video when a slide is activated or deactivated.
  $.widget("ui.skatecontrol_mediacontrol", $.ui.skatecontrol, {
    options: $.extend({}, $.ui.skatecontrol.prototype.options, {
      autoplay: false,
      autopause: false,
    }),

    refresh: function() {
      var self = this;
      // Delay by a small amount so that all events that may have started media have already propegated.
      if (this.t) {
        clearTimeout(this.t);      
      }
      this.t = setTimeout(function() {
        self.skate.items.find('audio, video').each(function() {
          if (self.options.autopause && this.pause) {
            this.pause();
          }
          // TODO: Implement autoplay.
        });    
      }, 500);
    }
  });


})( jQuery );
