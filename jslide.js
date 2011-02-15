var jslide = (function() {
  function SpotLight(w,h) {
    var canvas, grad;

    // build canvas
    canvas = $('<canvas></canvas>').addClass('jslideSpotlight');
    $.append(canvas);
    this.canvas = canvas[0];
    this.shown = false;

    // initial position
    this.x = 0;
    this.y = 0;

    // draw and cache spotlight
    this.c = this.canvas.getContext('2d');
    this.recache(w,h);
  }
  SpotLight.prototype.recache = function(w,h) {
    // resize temporarily
    this.canvas.width = w;
    this.canvas.width = h;
    // radial gradient
    grad = ctx.fillStyle =  ctx.createRadialGradient(w/2,h/2,r*0.75,w/2,h/2,r);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    // draw shapes
    this.c.fillStyle = grad;
    this.c.fillRect(0,0,w,h);
    this.im = this.c.getImageData( 0, 0, w, h );
    this.w = w;
    this.h = h;

    // scale back and redraw
    this.scale();
    this.draw();
  }
  SpotLight.prototype.draw = function() {
    this.c.fillStyle = 'rgba(0,0,0,0.5)';
    this.c.clearRect(0,0,this.w,this.h);
    this.c.fillRect(0,0,w,h);
    this.c.putImageData( this.im, this.x, this.y );

  }

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

    // debug
    //$('#deb').text('window='+ww+'x'+wh+' element='+ew+'x'+eh)
  
    // spotlight
    var canvas = $('#spotoverlay')[0];
    canvas.width = ww;
    canvas.height = wh;
    spotlightRedraw();
  }

  // go to slide
  var current;
  function goToSlide(n) {
    if( current !== undefined ) { 
      $(slideList[current]).css('left','-1999px');
      $(slideList[current]).css('opacity','0');
    }
    current = n;
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

  // build spotlight
  var ctx, im, spotW, spotH;
  function spotlightInit() {
    var canvas = $('#spotoverlay')[0],
        w = canvas.width,
        h = canvas.height,
        r = Math.min(w/2,h/2),
        grad;
    ctx = canvas.getContext('2d');

    // radila gradient
    grad = ctx.fillStyle =  ctx.createRadialGradient(w/2,h/2,r*0.75,w/2,h/2,r);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');

    // draw shapes
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,w,h);

    im = ctx.getImageData( 0, 0, w, h );
    spotW = w/2;
    spotH = h/2;
  }

  var spotX = 0, spotY = 0;
  function spotlightRedraw() {
    var canvas = $('#spotoverlay')[0],
        w = canvas.width,
        h = canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.clearRect(0,0,w,h);
    ctx.fillRect(0,0,w,h);
    ctx.putImageData( im, spotX, spotY );
  }

  // initialization
  var slideList;
  function init() {
    var i, h;
    // build list of slides, hide all slides, show slide 0
    slideList = $('div.slide');
    slideList.each( function(i,e) { $(e).css('left','-9999px'); })

    // spotlight
    spotlightInit();

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
        case 35: // home 
          goToSlide(slideList.length-1); break;
        case 36: // home 
          goToSlide(0); break;
        case 83 : // s
          $('#spotoverlay').fadeOut(); break;
        case 84 : // t
          $('#spotoverlay').fadeIn(); break;
      }
    } );
    $(document).mousemove( function(e) {
      var coord = e.pageX + ' ' + e.pageY;
      //$('#spotlight').css('background','-webkit-gradient( radial, '+coord+', 50, '+coord+', 80, from(rgba(0,0,0,0)), to(rgba(0,0,0,0.5)) )' );
      //$('#spotlight').css('left', e.pageX+'px' );
      //$('#spotlight').css('top', e.pageY+'px' );
      spotX = e.pageX-spotW;
      spotY = e.pageY-spotH;
      spotlightRedraw();
    } );
  }

  return {
    init : init,
    spot : spotlightInit,
    nextSlide : nextSlide,
    prevSlide : prevSlide,
    freeze    : function() { frozen = true; },
    unfreeze  : function() { frozen = false; },
    getStatus : function() { return [ current, slideList, ctx, im ]; }
  };
})();

$(jslide.init);
