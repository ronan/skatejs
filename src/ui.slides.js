/*
 * jQuery UI Slides
 *
 * Base class for slideshow and sliding tab widgets
 *
 * Copyright (c) 2010 Ronan Dowling
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 *
 * Depends:
 *	ui.core.js
 */
 
;(function($) {
  $.widget("ui.slides", $.extend({}, {
    options: {
      animate: true,
      duration: 500,
      maskWidth: '',
      autoRotate: false,
      pause: true,
      loop: false,
      rowWidth: 1000,
      updateURL: true,

      // Callbacks
      hash: null,
      itemActivate: null
    },
    _init: function() {
      this._slidesInit();
    },
    _slidesInit: function() {
      this.element.addClass("ui-slides");
      this.element.data('slides', this);
      this.items_index = {};

      this._preInit();
      this._initItems();
      this._initWrappers();
      this._initHash();
      this._initAutoRotate();
      this._postInit();
      this._start();
    },
    _preInit: function() {},
    _postInit: function() {},
    _start: function(options) {
      var self = this;
      // If there's a hash sent by the browser activate that tab.
      var item = self.getHashItem && self.getHashItem();
      if (item && !item.is('.slides-active')) {
        this.activate(item, options || {animate: false, bubbleUp: true});
      }
      else if (!item && !self.items.eq(0).is('.slides-active')) {
        this.activate(self.items.eq(0), options || {animate: false, bubbleUp: true});
      }

      // Resize when the current image loads in case there is no height/width set in html.
      var that = this;
      this.items.filter('.slides-active').find('img').bind('load', function() {that._setHeight()});
    },
    _initHash: function() {
      var self = this;
      // Set up the hash change event to react to the back/forward button.
      if (this.options.updateURL) {
        $(window).bind('hashchange', function() {
          self._start({animate: true});
        });
      }
    },
    _initItems: function() {
      var self = this;
      this.items = $(this.options.items, this.element).data('slides', this).addClass('slides-item');
    },
    _initWrappers: function() {
      var o = this.options;

      this.wrapper     = this.items.eq(0).parent().wrapInner('<div class="slides-wrapper">').children().eq(0);
      this.mask        = this.wrapper.wrap('<div class="slides-mask">').parent().css({position: 'relative', overflow: 'hidden'});

      //Let's determine the parent's offset/height/width
      this.height      = o.height ? o.height : this._height();
      this.width       = o.width  ? o.width  : this._width();

      // Set the mask width if needed. Otherwise let it simply be auto.
      if (o.maskWidth) {
        this.mask.css('width', o.maskWidth);
      }

      this.maskWidth = this.mask.width();
      this.itemWidth = this.items.eq(0).width();
      this.itemsVisible = Math.max(1, Math.floor(this.maskWidth/this.itemWidth));

      this.wrapper.css({position: 'absolute', 'height': this.height, 'width': this.width * Math.min(o.rowWidth, this.items.length)});
      this._setHeight();
    },
    _initAutoRotate: function() {
      var self = this;
      this.options.paused = false;
      if (this.options.autoRotate) {
        setInterval(function() {
          if (!self.options.paused) {
            self.next();
          }
        }, this.options.autoRotate);
        if (this.options.pause) {
          this.element.hover(
            function() {self.options.paused = true},
            function() {self.options.paused = false}
          );
        }
      }
    },
    destroy: function() {
      this.element
        .removeClass("ui-slides ui-slides-disabled")
        .removeData("slides");
  
      for ( var i = this.items.length - 1; i >= 0; i-- )
        this.items[i].item.removeClass("slides-item");
    },
    _height: function() {
      return this.element.height();
    },
    _width: function() {
      return this.element.width();
    },
    _offset: function() {
      this.element.offset()
    },
    _setHeight: function() {
      var o = this.options;
      this.height      = o.height ? o.height : this._height();
      this.wrapper.css('height', this.height);
      this.mask.css('height', this.height);
    },
    activate: function(item, options) {
      options = options || this.options;

      item = $(item);
      if (item.hasClass('slides-item')) {
        if (!item.hasClass('slides-active')) {
          // Set the active class on the current tab and panel.
          item.siblings().removeClass('slides-active').addClass('slides-inactive');
          item.addClass('slides-active').removeClass('slides-inactive');
        }
        // Activate all ancestor slides/tab.
        if (options.bubbleUp) {
          this.bubbleUp();
        }
        // Do the actual activation.
        this.itemActivate(item, options || this.options);

        // Update the browser hash.
        if (options.updateURL && (hash = $.data(item.get(0), 'hash'))) {
          var pos = $(window).scrollTop();
          this.setHash(hash);
          $(window).scrollTop(pos);
        }

        // Do the slide callback.
        if (options.complete) {
          options.complete(item);
        }
      }
    },
    next: function() {
      var next = this.getNext();
      this.activate(next);
    },
    prev: function() {
      var prev = this.getPrev();
      this.activate(prev);
    },
    getNext: function() {
      var next = this.items.filter('.slides-active').next();

      // Make sure we're not scrolling past the last visible item.
      var index = next.index();
      if (index > this.items.length - this.itemsVisible) {
        next = [];
      }
      // Loop if needed.
      if (next.length == 0 && this.options && this.options.loop) {
        next = this.items.eq(0);
      }
      return next;
    },
    getPrev: function() {
      var prev = this.items.filter('.slides-active').prev();
      if (prev.length == 0 && this.options && this.options.loop) {
        prev = this.items.eq(this.items.length - 1);
      }
      return prev;
    },
    itemActivate: function(item, options) {},
    bubbleUp: function() {
      this.element.parents('.slides-item').each(function() {
        if (slides = $(this).data('slides')) {
          slides.activate(this, {animate: false});
        }
      });
    },
    generateHash: function(item) {
      if (this.options.hash) {
        return this.options.hash(item);
      }
      return '#';
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
      return this.items_index[this.getHash()];
    }
  }));
})(jQuery);


