function jsKMC( ss, canvasSel, uiSel, rcanvasSel ) {
  var canvas = $(canvasSel)[0],
      rcanvas = $(rcanvasSel)[0],
      c = canvas.getContext('2d'),
      cr =rcanvas.getContext('2d'),
      w = canvas.width,
      h = canvas.height,
      wr = rcanvas.width,
      hr = rcanvas.height,
      doRates = true,
      handler, ui = {},
      r, R = [], Rtot,
      i,j, v = { x: 0, y: 0 },
      cs = Math.floor( Math.min( Math.floor(w/ss), Math.floor(h/ss) ) ),
      style = [],
      // interaction energies for ABV (AA,AB,AV, BA,BB,BV, VA,VB,VV)
      Exy = [ [ 1, 0.25, 0.1 ], [ 0.25, 1, 0.1 ], [ 0.1, 0.1, 0 ] ],
      
      // kT=0.5, Exy = [ [ 1, 0.25, 0.3 ], [ 0.25, 1, 0.3 ], [ 0.3, 0.3, 0 ] ], // decent phase separation
      // increase kT to 2, observe solubility
      // at kT=5 look at planar interface
      // at kT=0.15 look at planar interface
      // temperature
      kT = 0.5,
      // nearest neighbors (uldr)
      nn = [[0,-1],[1,0],[0,1],[-1,0]],
      // simulation cell
      grid = new Array(ss*ss);

  function update(x,y) {
    c.putImageData( style[grid[x+ss*y]], x*cs, y*cs );
  }
  function render() {
    var x, y;
    for( x = 0; x < ss; ++x ) {
      for( y = 0; y < ss; ++y ) {
        update(x,y);
      }
    }   
  }
  function showRates() {
    var n, Rcum=0.0;
    cr.clearRect( 0, 0, wr, hr );
    cr.strokeStyle='rgb(0,0,0)';
    cr.lineWidth = 2;
    cr.beginPath();
    function tick(x) {
      cr.moveTo(x,0);
      cr.lineTo(x,hr);
    } 
    tick(0+5);
    for( n=0; n<nn.length; n++ ) {
      Rcum += R[n];
      tick( (Rcum*(wr-10))/Rtot + 5 );
    }
    cr.moveTo( 0+5,hr/2);
    cr.lineTo( wr-5,hr/2 );
    cr.closePath();
    cr.stroke();
    cr.strokeStyle='rgb(255,0,0)';
    cr.beginPath();
    tick( (r*(wr-10))/Rtot + 5 );
    cr.closePath();
    cr.stroke();
  }

  function getRates() {
    var nx,ny, C, n2x,n2y, E, n,n2, r2;

    // obtain rates from binding energies (set saddlepoint energy to 0)
    Rtot = 0.0
    for( n = 0; n < nn.length; n++ ) {
      E = 0.0;
      nx = ( v.x + nn[n][0] + ss ) % ss;
      ny = ( v.y + nn[n][1] + ss ) % ss;
      C = grid[nx+ss*ny];
      for( n2 = 0; n2 < nn.length; n2++ ) {
        n2x = ( v.x + nn[n][0] + nn[n2][0] + ss ) % ss;
        n2y = ( v.y + nn[n][1] + nn[n2][1] + ss ) % ss;
        E += Exy[C][grid[n2x+ss*n2y]];
      }
      r = Math.exp( -E/kT );
      R[n] = r;
      Rtot += r;
    }

    // pick random number 0<=r<Rtot
    r = Math.random() * Rtot;
  }

  function jump() {
    var nx,ny, C, n2x,n2y, E, n,n2, r2;
    // execute corresponding event
    for( n = 0; n < nn.length; n++ ) {
      if( r < R[n] ) {
        nx = ( v.x + nn[n][0] + ss ) % ss;
        ny = ( v.y + nn[n][1] + ss ) % ss;
        grid[v.x+ss*v.y] = grid[nx+ss*ny];
        grid[nx+ss*ny] = 2;
        update(nx,ny);
        update(v.x,v.y);
        v.x = nx;
        v.y = ny;
        break;
      } else {
        r -= R[n];
      }
    }
  }

  // initialize sample
  function init() {
    var i;
    switch( ui.geometry.val() ) {
      case 'pure': 
        for( i = 0; i < ss*ss; ++i ) {
          grid[i] = 0;
        }
        break;
      case 'rand': 
        for( i = 0; i < ss*ss; ++i ) {
          grid[i] = Math.round(Math.random());
        }
        break;
      case 'layr': 
        for( i = 0; i < ss*ss; ++i ) {
          grid[i] = i<(ss*ss/2) ? 0:1;
        }
        break;
    }
    // set vacancy
    v.x = Math.floor(ss/2);
    v.y = Math.floor(ss/2);
    grid[v.x+ss*v.y] = 2;
    render();
  }

  // build ui
  ui.geometry = $('<select></select>')
      .append($("<option></option>").attr("value",'pure').text('Pure A'))
      .append($("<option></option>").attr("value",'rand').text('Random solution'))
      .append($("<option></option>").attr("value",'layr').text('Bi-layer')).change(init);
  ui.kT = $('<input type="text"/>').attr("value",kT).attr("title",'kT').attr("size","5").change( function() { 
    kT = parseFloat(this.value) 
  } );
  ui.step = $('<button>Step</button>').click( function() {
    clearInterval(handler);
    if( doRates ) { 
      // when switching into step mode we need to calculate rates for the first jump
      getRates();
      doRates = false;
    }
    jump();
    getRates();
    ui.rate.text(Rtot.toPrecision(3));
    showRates();
  } );
  ui.slow = $('<button>Slow</button>').click( function() {
    clearInterval(handler);
    ui.rate.text('');
    cr.clearRect( 0, 0, wr, hr );
    doRates = true;
    handler = setInterval( function() { getRates(); jump(); }, 1000/5 );
  } );
  ui.fast = $('<button>Fast</button>').click( function() {
    clearInterval(handler);
    ui.rate.text('');
    cr.clearRect( 0, 0, wr, hr );
    doRates = true;
    handler = setInterval( function() {
      var i;
      for( i=0; i<20; i++ ) {
        getRates();
        jump();
      }
    }, 1000/50 );
  } );

  // output rates here
  ui.rate = $('<span></span>');

  // generate UI for setting interaction matrix entries
  var tr;
  function exyChanger(i,j) {
    return function() {
      Exy[i][j] = parseFloat(this.value);
      Exy[j][i] = parseFloat(this.value);
      ui.exy.find( ('input[name="E'+j)+i+'"]' ).val(Exy[j][i]);
    }
  }
  tr = $('<tr></tr>').append( $('<td></td>') );
  for( i = 0; i<3; i++ ) {
    tr.append( $('<th></th>').text( ['A','B','V'][i] ) );
  }
  ui.exy = $('<table></table>').append(tr);
  for( i = 0; i<3; i++ ) {
    tr = $('<tr></tr>').append( $('<th></th>').text( ['A','B','V'][i] ) );
    for( j = 0; j<3; j++ ) {
      tr.append(
        $('<td></td>').append( 
          $('<input type="text"/>').val(Exy[i][j]).attr("title",'E'+i+j).attr("name",('E'+i)+j).attr("size","5").change( exyChanger(i,j) )
        )
      );
    }
    ui.exy.append(tr);  
  }

  $(uiSel).append(ui.geometry)
    .append(ui.step).append(ui.slow).append(ui.fast)
    .append( $('<div></div>').text('kT=').append(ui.kT) )
    .append( $('<div></div>').text('Total rate:').append(ui.rate) )
    .append(ui.exy);

  // prerender atoms
  c.clearRect( 0, 0, cs, cs );
  c.strokeStyle = 'rgb(0,0,0)';
  c.fillStyle   = 'rgb(255,255,255)';
  c.beginPath();
  c.arc( cs/2, cs/2, cs/2-1, 0, Math.PI*2.0, true);
  c.closePath();
  c.fill();
  c.stroke();
  style[0] = c.getImageData( 0, 0, cs, cs );

  c.clearRect( 0, 0, cs, cs );
  c.fillStyle   = 'rgb(0,0,0)';
  c.beginPath();
  c.arc( cs/2, cs/2, cs/2-1, 0, Math.PI*2.0, true);
  c.closePath();
  c.fill();
  c.stroke();
  style[1] = c.getImageData( 0, 0, cs, cs );

  c.clearRect( 0, 0, cs, cs );
  c.fillStyle   = 'rgb(255,0,0)';
  c.fillRect( cs/4,cs/4,cs/2,cs/2 );
  style[2] = c.getImageData( 0, 0, cs, cs );

  return { 
    start : function() {
      init();
      ui.slow.click();
    },
    stop : function() {
      ui.step.click();
    },
    data  : grid
  }
}
