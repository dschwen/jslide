var jslide = (function() {
  function buildSpotLight(r) {
    var canvas, c, grad, im,
        shown = false,
        x, y;

    // build canvas
    canvas = $('<canvas/>').addClass('jslideSpotlight');
    $('body').append(canvas);

    // initial position
    x = 0;
    y = 0;

    // draw and cache spotlight
    c = canvas[0].getContext('2d');
    recache(r);

    // bind the 'dry' mousemove handler (only update coordinates, no redrawing)
    $(document).bind( 'mousemove', mouseMoveHandlerDry );

    // methods
    function recache(newr) {
      r = newr;
      // resize temporarily
      canvas[0].width = 2*r;
      canvas[0].height = 2*r;
      // radial gradient
      grad = c.createRadialGradient(r,r,r*0.75,r,r,r);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      // draw shapes
      c.fillStyle = grad;
      c.fillRect(0,0,2*r,2*r);
      im = c.getImageData( 0, 0, 2*r, 2*r );

      // scale back and redraw
      scale();
    }
    function scale() {
      var w = $(window).width(),
          h = $(window).height();
      canvas[0].width = w;
      canvas[0].height = h;
      draw();
    }
    function draw() {
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.clearRect(0,0,canvas[0].width,canvas[0].height);
      c.fillRect(0,0,canvas[0].width,canvas[0].height);
      c.putImageData( im, x, y );
    }
    function mouseMoveHandler(e) {
      var coord = e.pageX + ' ' + e.pageY;
      x = e.pageX - r;
      y = e.pageY - r;
      draw();
    }
    function mouseMoveHandlerDry(e) {
      var coord = e.pageX + ' ' + e.pageY;
      x = e.pageX - r;
      y = e.pageY - r;
    }
    function mouseWheelHandler(e, delta) {
      var newr = Math.floor( r + (10+r/10)*delta );
      if( newr < 30 || newr > 1000 ) { return; }
      x = x + r - newr;
      y = y + r - newr;
      recache( newr );
    }
    function show() {
      $(document).unbind( 'mousemove', mouseMoveHandlerDry );
      $(document).bind( 'mousemove', mouseMoveHandler );
      $(document).mousewheel( mouseWheelHandler );
      $(window).bind( 'resize', scale );
      $('body').css('cursor','crosshair');
      scale();
      canvas.fadeIn();
      shown = true;
    }
    function hide() {
      $(document).unbind( 'mousemove', mouseMoveHandler );
      $(document).bind( 'mousemove', mouseMoveHandlerDry );
      $(document).unmousewheel( mouseWheelHandler );
      $(window).unbind( 'resize', scale );
      $('body').css('cursor','');
      canvas.fadeOut();
      shown = false;
    }
    function toggle() {
      if( shown ) {
        hide();
      } else {
        show();
      }
      return shown;
    }

    return {
      toggle : toggle
    };
  };

  function scale() {
    var cs = $(slideList[current]),
        ww = $(window).width(),
        wh = $(window).height(),
        ew = cs.outerWidth(),
        eh = cs.outerHeight(),
        r = Math.min(ww/ew,wh/eh),
        sx = Math.round((ww-ew*r)/2),
        sy = Math.round((wh-eh*r)/2);

    // scale
    $.each(['webkit','moz','o'], function(i,p) { cs.css('-'+p+'-transform','scale('+r+', '+r+')'); } );

    // center
    cs.css('left',sx+'px');
    cs.css('top',sy+'px');
  }

  // go to slide
  var current;
  function goToSlide(n) {
    var handler;
    // leaving a slide or entering the presentation?
    if( current !== undefined ) {
      // fire onleave handler for current slide (may prevent leaving)
      handler = $(slideList[current]).data('onleave');
      if( handler && handler() === false ) {
        return;
      }

      // hide current slide
      $(slideList[current]).css('left','-1999px');
      $(slideList[current]).css('opacity','0');
    }
    current = n;

    // fire onenter hander before slide becomes visible
    handler = $(slideList[current]).data('onenter');
    if( handler ) {
      handler();
    }

    // make visible changes
    window.location.hash = slideList[current].id;
    $(slideList[current]).css('opacity','1');
    scale();
  }

  // next slide
  function nextSlide() {
    if( current < slideList.length-1 ) {
      goToSlide(current+1);
    }
  }

  // previous slide
  function prevSlide() {
    if( current > 0 ) {
      goToSlide(current-1);
    }
  }

  // initialization
  var slideList, spotLight;
  function init() {
    var i, j, h,
        common,
        handlerList = ['onleave', 'onenter'];

    // build list of slides, hide all slides, show slide 0
    slideList = $('div.slide');
    slideList.each( function(i,e) { $(e).css('left','-9999px'); });

    // append common content to all slides
    common = $('.slidecommon').detach();
    slideList.append(common);

    // compile slide event handlers
    slideList.each( function(i,e) {
      var handler;
      for( j = 0; j < handlerList.length; ++j ) {
        handler =  $(e).data(handlerList[j]);
        if( handler ) {
          $(e).data(handlerList[j], new Function(handler) );
        }
      }
    });

    // Spotlight
    spotLight = buildSpotLight(100);

    // honor url hash
    h = window.location.hash.substr(1);
    if( h !== '' ) {
      for( i = 0; i < slideList.length; ++i ) {
        if( slideList[i].id === h ) {
          goToSlide(i);
          break;
        }
      }
      if( i == slideList.length ) {
        // not found
        alert( h + " not found" );
        goToSlide(0);
      }
    } else {
      goToSlide(0);
    }
    $(window).resize(scale);
    scale();

    // add event handlers
    var frozen = false;
    $(document).keyup( function(e) {
      if( frozen ) { return; }
      switch(e.which) {
        case 34: // page down 
        case 39: // crsr right 
        case 40: // crsr down
        case 32: // space 
          nextSlide(); break;
        case 8 : // backspace
        case 33: // page up 
        case 37: // crsr left 
        case 38: // crsr up 
          prevSlide(); break;
        case 35: // end
          goToSlide(slideList.length-1); break;
        case 36: // home
          goToSlide(0); break;
        case 83 : // s
          spotLight.toggle(); break;
      }
    } );
  }

  return {
    init : init,
    nextSlide : nextSlide,
    prevSlide : prevSlide,
    freeze    : function() { frozen = true; },
    unfreeze  : function() { frozen = false; },
    getStatus : function() { return [ current, slideList, spotLight ]; }
  };
})();

$(jslide.init);
