
numberOfTerminals = 0;
terminalCircleRadius = 4;

/*
 * Allowed terminal directions
 */
NORTH = 'NORTH';
SOUTH = 'SOUTH';
WEST = 'WEST';
EAST = 'EAST';

/*
 * Virtual terminal
 * 
 * Stores voltage
 * Interconnects with other terminals
 */
Terminal = function(parentElement, debug) {
    
    this.name = 'terminal'+(numberOfTerminals++);
    this.parentElement = parentElement;
    this.debug = debug ? debug : (this.parentElement.debug ? this.parentElement.debug : false);
    this.voltage = 0;
    this.connectedTerminals = [];
    this.direction = NORTH;
    this.label = '';
};

Terminal.prototype.getName = function() {
    return this.parentElement.getName()+' > '+this.name;
};

/*
 * Check if the applied voltage differs from our terminal voltage.
 * If yes, apply it and tell all connected terminals to update aswell.
 */
Terminal.prototype.setVoltage = function(voltage, updateConnectedTerminals) {
    
    if (voltage != this.voltage) {
        if (this.debug)
            console.log(this.getName()+'.setVoltage('+voltage+');');
        
        // update this terminal
        this.voltage = voltage;
        if (typeof this.onSetVoltage != 'undefined')
            this.onSetVoltage();
        
        // update connected terminals
        if (updateConnectedTerminals ? updateConnectedTerminals : true)
            for (var i=0; i<this.connectedTerminals.length; i++)
                this.connectedTerminals[i].setVoltage(voltage, updateConnectedTerminals=false);
    };
};

/*
 * Connect with a terminal if it's not already connected
 * and tell it to add us aswell.
 */
Terminal.prototype.connectTerminal = function(T) {
    
    if (this.connectedTerminals.indexOf(T) == -1) {
        if (this.debug)
            console.log(this.getName()+'.connectTerminal( '+T.getName()+' );');
        this.connectedTerminals.push(T);
        T.connectTerminal(this);
    };
};

/*
 * Delete T from the list of connected terminals
 * and also tell T to remove us from it's list.
 */
Terminal.prototype.disconnectTerminal = function(T) {
    
    if (this.connectedTerminals.indexOf(T) > -1) {
        if (this.debug)
            console.log(this.getName()+'.disconnectTerminal( '+T.getName()+' );');
        this.connectedTerminals.splice(this.connectedTerminals.indexOf(T), 1);
        T.disconnectTerminal(this);
    };
};

/*
 * Tell all connected terminals to disconnect from this terminal
 * (could also work the other way around, but doesn't make a difference)
 */
Terminal.prototype.disconnectAllTerminals = function() {
    
    for (var i=0; i<this.connectedTerminals.length; i++) {
        this.connectedTerminals[i].disconnectTerminal(this);
    }
    
    // should already be empty here, just to make sure
    this.connectedTerminals = [];
};

/*
 * Define an SVG element that corresponds to this terminal
 */
Terminal.prototype.hookSVG = function(element) {
    
    this.svg = element;
    this.svg.attr('id',this.name);
    
    /*
     * Programming a closure for the event function
     * 
     * The SVG element throws the event ("this").
     * Additionally the event itself aswell as
     * the corresponding terminal object are provided.  
     */ 
    var terminal = this;
    // [0][0] is due to d3 syntax
    // d3's .on does not provide the proper this, event nor terminal 
    this.svg[0][0].onclick = function(event) { onTerminalClick.call(event.toElement, event, terminal); };
};

/*
 * Move a terminal to a new position
 * 
 * This method is called implicitly, when elements are moved,
 * especially by the drag'n'drop handler.
 * 
 * Here not only the terminal's SVG is moved to a new position.
 * Also connected terminals are processed:
 * Internally connected terminals should not be visually separated.
 * Therefore, if a terminal is connected, which belongs to a wire, this wire is moved to the new coordinates aswell.
 * Other kinds of elements should be disconnected.
 */
Terminal.prototype.setXY = function(x, y, updateConnectedTerminals) {
    
    if (typeof x == 'object') {
        y = x.y;
        x = x.x;
    }
    
    var now = this.getXY();
    if (now.x != x || now.y != y) {
        
        // move circle to new position
        this.svg.attr('cx',x);
        this.svg.attr('cy',y);
        
        // update connected terminals
        if (updateConnectedTerminals ? updateConnectedTerminals : true) {
            for (var i=0; i<this.connectedTerminals.length; i++) {
                var e = this.connectedTerminals[i].parentElement;
                if (e instanceof Wire) {
                    if (e.terminals[0].connectedTerminals.indexOf(this) > -1) {
                        e.setFrom(x, y, updateTerminals=false);
                    } else {
                        e.setTo(x, y, updateTerminals=false);
                    }
                }
            }
        }
    }
};

Terminal.prototype.getXY = function() {
    return {x:this.svg[0][0].cx.baseVal.value, y:this.svg[0][0].cy.baseVal.value};
};

onTerminalClick = function(event, terminal) {
    /*
    console.log(this);
    console.log(event);
    console.log(terminal);
    console.log(terminal.parentElement);
    */
    
    var schematic = terminal.parentElement.parentSchematic;
    if (typeof selection === 'undefined') {
        selection = {
            begin: terminal.getXY(),
            beginTerminal: terminal,
            path: schematic.svg.append('svg:path').attr('class','connectTerminalsLine'),
        };
        $('#svg').bind('mousemove', refreshConnectTerminalsLine);
        $('#svg').bind('keyup', cancelConnectTerminalsLine);
    } else {
        selection.endTerminal = terminal;
        
        var wire = new Wire(schematic);
        wire.setFrom( selection.beginTerminal.getXY() );
        wire.setTo( selection.endTerminal.getXY() );
        selection.beginTerminal.connectTerminal( wire.terminals[0] );
        wire.terminals[1].connectTerminal( selection.endTerminal );
        if (terminal.debug)
            console.log(schematic);
        
        selection.path.remove();
        $('#svg').unbind('movemove');
        delete selection;
    };
};

/*
 * Dashed line shall follow mouse move
 */
refreshConnectTerminalsLine = function(event) {
    if (typeof selection != 'undefined') {
        selection.end = {x:event.originalEvent.x-$('#svg')[0].offsetLeft-2, y:event.originalEvent.y-$('#svg')[0].offsetTop-2};
        selection.path.attr('d','M'+coord(selection.begin)+' L'+coord(selection.end));
        //console.log(coord(selection.end));
    }
};

cancelConnectTerminalsLine = function(event) {
    console.log(event);
    console.log(event.originalEvent);
};
