function shearSim( selector, initFunc, ncell ) {
  var canvas = $(selector)[0],
      c = canvas.getContext('2d'),
      w = canvas.width,
      h = canvas.height,
      x, y,
      ss = ncell || 40,
      step = 0, paused, handler = null,
      waitcount=0,
      p = [0,0], d, o,
      grid = new Array(ss*ss),
      grid2 = new Array(ss*ss),
      col = [ "rgb(200,200,200)", "rgb(55,55,55)" ],
      cs = Math.floor( Math.min(w/(ss+2),h/(ss+2)) );


  function render() {
    var x, y, i, sx, sy;

    c.setTransform(1,0,0,1,0,0);
    c.clearRect( 0, 0, w, h );
    c.translate(w/2,h/2);

    // trace
    c.strokeStyle = "rgb(0,0,0)";
    c.lineWidth = 1;
    for( x = 0; x < ss; ++x ) {
      for( y = 0; y < ss; ++y ) {
        sx = 0; sy = 0;
        if( o==0 && ( ( p[0]<p[1] && y>=p[0] && y<p[1] ) || (p[0]>=p[1] && ( y>=p[0] || y<p[1]) ) ) ) {
          sx = d*step;
        } else if( o==1 && ( ( p[0]<p[1] && x>=p[0] && x<p[1] ) || (p[0]>=p[1] && ( x>=p[0] || x<p[1]) ) ) ) {
          sy = d*step;
        }
        c.fillStyle = col[ grid[x+ss*y] ];
        c.fillRect(   (x-ss/2)*cs+sx, (y-ss/2)*cs+sy, cs, cs );
        c.strokeRect( (x-ss/2)*cs+sx, (y-ss/2)*cs+sy, cs, cs );
      }
    }

    // planes
    c.lineWidth = 2;
    c.strokeStyle = "rgb(255,0,0)";
    for( i = 0; i < 2; ++i ) {
      c.beginPath();
      if( o == 0 ) {
        c.moveTo( -ss/2*cs, (p[i]-ss/2)*cs );
        c.lineTo(  ss/2*cs, (p[i]-ss/2)*cs );
      } else {
        c.moveTo( (p[i]-ss/2)*cs, -ss/2*cs );
        c.lineTo( (p[i]-ss/2)*cs,  ss/2*cs );
      }
      c.closePath();
      c.stroke();
    }
  }

  function shift() {
    waitcount--;
    if(waitcount>=0) return;

    if( step == 0 ) {
      o = Math.floor( Math.random() * 2 );  // 0=x, 1=y
      d = Math.floor( Math.random() * 2 ) * 2 - 1;  // direction -1/1
      p[0] = Math.floor( Math.random() * ss );
      p[1] = Math.floor( Math.random() * ss );
      waitcount = 25;
    } else waitcount = 2;
    render();

    step+=1;
    if( step >= cs ) {
      apply();
      step = 0;
    }
  }

  function apply() {
    var i, x, y, sx, sy;
    // copy to buffer
    for( i = 0; i < ss*ss; ++i ) {
      grid2[i] = grid[i];
    }

    // now move
    for( x = 0; x < ss; ++x ) {
      for( y = 0; y < ss; ++y ) {
        sx = 0; sy = 0;
        if( o==0 && ( ( p[0]<p[1] && y>=p[0] && y<p[1] ) || (p[0]>=p[1] && ( y>=p[0] || y<p[1]) ) ) ) {
          sx = d;
        } else if( o==1 && ( ( p[0]<p[1] && x>=p[0] && x<p[1] ) || (p[0]>=p[1] && ( x>=p[0] || x<p[1]) ) ) ) {
          sy = d;
        }
        grid[ x + ss*y ] = grid2[ (x-sx+ss)%ss + ss * ((y-sy+ss)%ss) ];
      }
    }

  }

  // initialize sample
  if( typeof initFunc === 'function' ) {
    initFunc( grid, ss );
  } else {
    for( x = 0; x < ss; ++x ) {
      for( y = 0; y < ss; ++y ) {
        grid[x+ss*y] = (x-ss/2+0.5)*(x-ss/2+0.5)+(y-ss/2+0.5)*(y-ss/2+0.5) < 0.75*ss*ss/4 ? 1 : 0;
      }
    }
  }

  return shift; 
}

