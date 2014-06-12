/*
 *  clipListButton
 *
 *  simple audio player that creates a button for audio playback
 *  of a list of files in sequence
 *
 */

clipListButton = ( function ($) {

  var 
      // module public methods
      configure, createPlayer, stopAll,
      
      // request fuctions for AudioPlayer
      _requestStop, _requestStart,
      
      // module state
      state = {
        playing_player  : null,
        audioPlayers    : [],
      },
      
      // configuration for AudioPlayer objects
      playerConfig,
      defaultPlayerConfig = {
        data_files  : 'data-files',
        root_url    : '',
        preload     : 'auto',
        player_html : '<div class="clip-list-button"></div>',
        pause       : 0,
      },
      
      // module configuration
      config,
      defaultConfig = {
        single_player : true,   // only one player playing at a time
      };

      
  function AudioPlayer( element, options ) {
    var file_string, files,
        $element = $( element );
        
    this.config = $.extend( {}, playerConfig, options );

    this.$button_element = $( this.config.player_html );
    $element.append( this.$button_element );
    this.$button_element.data( 'audioPlayer', this );  // point back at this from jquery object
    this.$button_element.click( this._onClick );
    
    this.audioElements = [];
    this.currentlyPlayingIndex = -1;
    this.currentlyPlayingElement = null;
    this.playing = false;
    this.timer = null;
    
    files = this.config.files
            || this._getFilesFromString( $element.attr( this.config.data_files ) );
    
    this._setFiles( files );
	
  }
  
  /***
   * Client API
   **/
  
  AudioPlayer.prototype.getElement = function() {
    return this.$element;
  };

  // 
  AudioPlayer.prototype.setAudio = function( files ) {
    files = ( typeof files == 'string' ) ? [ files ] : files;   
     _requestStop( this );
    this._setFiles( files );
  };
  
  // 
  AudioPlayer.prototype.play = function(  ) {
    if ( this.playing ) { return; }
    if ( this.audioElements.length === 0 ) { return; }
    _requestStart( this );
  };
  
  // 
  AudioPlayer.prototype.stop = function(  ) {
    _requestStop( this );
  };
  
  /***
   * Private functions.   Module client should not use.
   **/
  
  // Only module should call this method
  AudioPlayer.prototype._startPlayback = function() {
    var player = this;

    if ( this.audioElements.length === 0 ) { return false; }

    player.currentlyPlayingElement = player.audioElements[0];
    player.currentlyPlayingIndex = 0;
    player.currentlyPlayingElement.play();
    player.playing = true;
    player.$button_element.addClass( 'playing' );
    return true;
  };
    
  // Only module should call this method
  AudioPlayer.prototype._stopPlayback = function() {
    var player = this;

    player.playing = false;
    player.$button_element.removeClass( 'playing' );
    if ( player.timer ) {
      clearTimeout( player.timer );
      player.timer = null;
    }
    if ( player.currentlyPlayingElement ) {
      player.currentlyPlayingElement.pause();
      player.currentlyPlayingElement.currentTime = 0;
      player.currentlyPlayingIndex = -1;
    }
  };
    
  // private
  AudioPlayer.prototype._onClick = function( e ) {
    // "this" is the clicked element, not the AudioPlayer
    var player = $( this ).data( 'audioPlayer' );    
    if ( player.playing ) { return; }
    if ( player.audioElements.length === 0 ) { return; }
    _requestStart( player );
  };
  
  // private
  AudioPlayer.prototype._onEnded = function( e ) {
    var player = this;

    player.currentlyPlayingElement = null;
    if ( player.currentlyPlayingIndex + 1 < player.audioElements.length ) {
      if ( player.config.pause ) {
        player.timer = setTimeout( function() { player._onTimeout(); }, player.config.pause );
      }
      else {
        player.currentlyPlayingIndex++;
        player.currentlyPlayingElement = player.audioElements[ player.currentlyPlayingIndex ];
        player.currentlyPlayingElement.play();
      }
    }
    else {
      _requestStop( player );
    }
  };
    
  // private
  AudioPlayer.prototype._onTimeout = function( e ) {
    var player = this;
    
    player.timer = null;

    player.currentlyPlayingIndex++;
    player.currentlyPlayingElement = player.audioElements[ player.currentlyPlayingIndex ];
    player.currentlyPlayingElement.play();
  };
    
  // private
  // Get array of filenames from a comma delimited string of filenames
  AudioPlayer.prototype._getFilesFromString = function( file_string ) {
    var files = [];
    if ( file_string ) {
      $.each( file_string.split( ',' ), function(){
        files.push( $.trim( this ) );
      });
    }
    return files;
  };
  
  // private
  AudioPlayer.prototype._setFiles = function( files ) {
    var audioElement,
        player = this;
		
    player.audioElements = [];
    if ( files ) {
      $.each( files, function( i, file ) {
        if ( !file ) return;
        audioElement = document.createElement('audio');
        audioElement.src = player.config.root_url + file;
        audioElement.preload = player.config.preload;
      
        player.audioElements.push( audioElement );
        
        audioElement.addEventListener( 'ended', function( e ) {
          player._onEnded( e );
        });
      });
    }
    
    if ( player.audioElements.length ) {
      player.$button_element.removeClass( 'disabled' );
    }
    else {
      player.$button_element.addClass( 'disabled' );
    }
  };
  
  /*******************************************************/
  /*   Module functions  
  /*******************************************************/  
 
  // AudioPlayer instances do not start themselves.  They request to start
  // and the module will start them by calling _stopPlayback
  _requestStop = function ( audioPlayer ) {
    if ( config.single_player && state.playing_player == audioPlayer ) {
      state.playing_player = null;
    }
    audioPlayer._stopPlayback();
  };

  // AudioPlayer instances do not start themselves.  They request to start
  // and the module will start them by calling _startPlayback
  _requestStart = function ( audioPlayer ) {
    if ( config.single_player ) {
      if ( state.playing_player && state.playing_player != audioPlayer ) {
        state.playing_player._stopPlayback();
      }
      state.playing_player = audioPlayer;
    }
    audioPlayer._startPlayback();    
  };
  
  /**
   * Module public API
   **/
  
  // options        : options for the entire module ( optional )
  // playerOptions  : default options for AudioPlayer instances ( optional )
  configure = function( options, playerOptions ) {
    config = $.extend( {}, defaultConfig, options );
    playerConfig = $.extend( {}, defaultPlayerConfig, playerOptions );
  };
  
  // element :  DOM element to make into player
  // options :  override default AudioPlayer options ( optional )
  //   files       : array of filenames of audio files to load into player
  //   data_files  : DOM element attribute for list of audio files to initially load
  //   root_url    : too to prepend to filenames to get file URL
  //   preload     : preload attribute for created <audio> elements
  //   player_html : HTML to inject into element
  //   pause       : pause in ms between files
  createPlayer = function ( element, options ) {
    var p = new AudioPlayer( element, options );
    state.audioPlayers.push( p );
    return p;
  };
  
  stopAll = function ( element, options ) {
    $.each( state.audioPlayers, function() {
      this._stopPlayback();
    });
  };
  
  return {
    configure    : configure,
    createPlayer : createPlayer,
    stopAll      : stopAll,
  };
  
})( jQuery );
