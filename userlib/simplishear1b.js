function simpliShear1b(selector) {
  var canvas = $(selector)[0],
      c = canvas.getContext('2d'),
      w = canvas.width,
      h = canvas.height,
      x,
      cs = 2,
      ss = Math.floor(w/cs),
      sh = Math.floor(h/cs),
      steps = sh,
      p = [0,0], dir, d, o,
      grid = new Array(ss),
      paused = true, handler = null,
      col = [ "rgb(200,200,200)", "rgb(55,55,55)", "rgb(255,155,155)", "rgb(155,0,0)", "rgb(155,255,155)", "rgb(0,155,0)" ];


  function render() {
    var x, i, co;

    c.clearRect( 0, 0, w, h );
    for( x = 0; x < ss; ++x ) {
      if( ( p[0]<p[1] && x>=p[0] && x<p[1] ) || (p[0]>=p[1] && ( x>=p[0] || x<p[1]) ) ) {
        co = 3 + dir;
        grid[x] += dir;
      } else {
        co = 0;
      }

      c.fillStyle = col[0+co];
      c.fillRect( x*cs, 0, cs, (sh-grid[x])*cs );
      c.fillStyle = col[1+co];
      c.fillRect( x*cs, (sh-grid[x])*cs, cs, grid[x]*cs );
    }
  }

  function shift() {
    if( paused ) {
      return;
    }
    p[0] = Math.floor( Math.random() * ss );
    p[1] = Math.floor( Math.random() * ss );
    dir = ( Math.random() < 0.5 ) ? 1 : -1;
    render();
    steps -= 1;
    if( steps > 0 ) {
      setTimeout( shift, 100 );
    } else {
      steps = sh;
      for( x = 0; x < ss; ++x ) {
        grid[x] = sh/2;
      }
      handler = setTimeout( shift, 5000 );
    }
  }

  // initialize sample
  for( x = 0; x < ss; ++x ) {
    grid[x] = sh/2;
  }
  return { 
    start : function() { paused = false; shift() },
    stop  : function() { paused = true; if( handler ) { clearTimeout(handler); handler = null; } },
    data  : grid
  }
}
