var CONTENT_PREFIX = ``;

var data_tiles = {}
var data_countries = {}
var data_player = ""
var data_events = {}
var data_decisions = {}
var data_variables = {}
var data_on_actions = { "on_tile_controller_change_default": [] }
var localisation = {}
var fired_events = {}
var battles = {};
var turn = -1;
var schedule = {}
var data_people = {};
var days = [];
var months = [];
var date = 0;
var year = 0;
var paused = true;
var wasPaused = true;
var speed = 3;
var game_loop;
var month;

var tooltip_text = "";
var map_style = "country";
var map_style_context = "";
var map_hover_tile = "";
var map_selected_tile = "";
var text_icons = {
    "true": '<div style="position:relative;display:inline-block;width:17px;height:17px;vertical-align:top;top:2px;"><img src="assets/texticons/yes.png" style="position:absolute;left:0px;top:0px;width:17px;height:17px"></img></div>',
    "false": '<div style="position:relative;display:inline-block;width:17px;height:17px;vertical-align:top;top:2px;"><img src="assets/texticons/no.png" style="position:absolute;left:0px;top:0px;width:17px;height:17px"></img></div>'
}

var mouseDown = 0;

// USER INTERFACE STUFF
function set_speed(sped) {
    speed = sped;
    if (!paused) unpause();
}
function pause_unpause() {
    if (paused) {
        unpause();
    }
    else {
        pause();
    }
}
function pause() {
    $("#pause-button").html("Unpause");
    clearInterval(game_loop);
    paused = true;
}
function unpause() {
    $("#pause-button").html("Pause");
    clearInterval(game_loop);
    game_loop = setInterval(do_turn, 1000/speed);
    paused = false;
}
function return_flag(flag, width, height) {
    return `<div style="position:relative;display:inline-block;width:${width}px;vertical-align:top;top:2px;">
    <img src="${flag}" style="position:absolute;left:0px;top:0px;width:${width}px;height:${height}px"></img>
    <img src="assets/interface/flag_overlay.png" style="position:absolute;left:0px;top:0px;width:${width}px;height:${height}px"></img>
    </div>`
}
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
} 
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
     ] : null;
}  
function on_tile_click(tile) {
    if (window.event.ctrlKey) {
        if (map_style == "tile_connections") {
            map_style_context = tile;
            load_map_style();
        }
        else {
            load_player(data_tiles[tile].controller);
        }
    }
    else if (window.event.altKey) {
        if (map_style == "tile_connections") {
            if (data_tiles[map_style_context].connections.includes(tile)) {
                data_tiles[map_style_context].connections.splice(data_tiles[map_style_context].connections.indexOf(tile), 1);
                data_tiles[tile].connections.splice(data_tiles[tile].connections.indexOf(map_style_context), 1);
            }
            else {
                data_tiles[map_style_context].connections.push(tile);
                data_tiles[tile].connections.push(map_style_context);
            }
            load_map_style();
        }
        else {
            change_tile_controller(tile, data_player);
        }
    }
}
function export_connections() {
    var out = {};
    for (tile in data_tiles) {
        out[tile] = data_tiles[tile].connections;
    }
    console.log(out);
}
function on_tile_over(tile) {
    tooltip_text = `<b class="yellow-text">${get_localisation(data_tiles[tile].name)}</b><br>${return_flag(data_countries[data_tiles[tile].controller].flag, 25, 17)} ${get_localisation(data_countries[data_tiles[tile].controller].long_name)}`;
    map_hover_tile = tile;
    tile_style(tile);
}
function on_tile_out(tile) {
    clear_tooltip();
    map_hover_tile = "";
    tile_style(tile);
}
function on_event_option_over(option) {
    var event_id = $(option).data('event');
    tooltip_text = run_effect( data_events[ fired_events[event_id]["event"] ].options[$(option).data('option')].effects, fired_events[event_id]["scopes"], true, false );
}
function clear_tooltip() {
    tooltip_text = "";
}
function event_option_button(event) {
    clear_tooltip();
    event_option( parseInt($(event).data('event')), parseInt($(event).data('option')) );
    $(event).parent().remove();
}
function handle_mousedown(e){

    window.my_dragging = {};
    my_dragging.pageX0 = e.pageX;
    my_dragging.pageY0 = e.pageY;
    my_dragging.elem = this;
    my_dragging.offset0 = $(this).offset();

    function handle_dragging(e){
        var left = my_dragging.offset0.left + (e.pageX - my_dragging.pageX0);
        var top = my_dragging.offset0.top + (e.pageY - my_dragging.pageY0);
        $(my_dragging.elem)
        .offset({top: top, left: left});
    }

    function handle_mouseup(e){
        $('body')
        .off('mousemove', handle_dragging)
        .off('mouseup', handle_mouseup);
    }

    $('body')
    .on('mouseup', handle_mouseup)
    .on('mousemove', handle_dragging);
}
function load_player(tag) {
    data_player = tag;
    $("#player-flag").attr("src", data_countries[data_player].flag);
    $("#player-title").html(get_localisation(data_countries[data_player].long_name));
    diplomacy_tab_generate();
    decision_tab_generate();
    politics_tab_generate();
}
function tile_style(tile) {
    var color1 = "#000000"
    switch (map_style) {
        case "country":
            if (tile == map_selected_tile) {
                var t = hexToRgb(data_countries[data_tiles[tile].controller].color);
                t = [t[0]-20, t[1]-20, t[2]-20];
                color1 = rgbToHex(...t);
            }
            else if (tile == map_hover_tile) {
                var t = hexToRgb(data_countries[data_tiles[tile].controller].color);
                t = [t[0]+20, t[1]+20, t[2]+20];
                color1 = rgbToHex(...t);
            }
            else {
                color1 = data_countries[data_tiles[tile].controller].color;
            }
            break;
        case "country_selected":
            if (data_tiles[tile].controller == map_style_context) {
                color1 = "#FFFFFF"
            }
            else if (data_tiles[tile].claims.includes(map_style_context)) {
                color1 = "#888888"
            }
            else {
                color1 = "#000000"
            }
            break;
        case "tile_connections":
            if (tile == map_style_context) {
                color1 = "#FFFFFF"
            }
            else if (data_tiles[map_style_context].connections.includes(tile)) {
                color1 = "#888888"
            }
            else {
                color1 = "#000000"
            }
            break;
    }
    $("#tile-"+tile).css('fill', color1 );
}
function load_map_style() {
    for (tile in data_tiles) {
        tile_style(tile);
    }
}
function diplomacy_tab_generate() {
    $(".diplomacy-tab-entry").remove();
    $("#diplo-hr").remove();
    $("#diplomacy-tab").append(`<div onmouseover="diplomacy_entry_over('${data_player}')" onmouseout="diplomacy_entry_out()" class="diplomacy-tab-entry shadow"><b><i>${return_flag(data_countries[data_player].flag, 25, 17)} ${get_localisation(data_countries[data_player].long_name)}</i></b></div><hr id="diplo-hr">`);

    for (country of [...Object.keys(data_countries)].sort()) {
        if (country != data_player) {
            $("#diplomacy-tab").append(`<div onmouseover="diplomacy_entry_over('${country}')" onmouseout="diplomacy_entry_out()" class="diplomacy-tab-entry shadow"><b>${return_flag(data_countries[country].flag, 25, 17)} ${get_localisation(data_countries[country].long_name)}</b></div>`);
        }
    }
}
function decision_tab_generate() {
    $(".decision-tab-entry").remove();

    for (decision of data_countries[data_player].visible_decisions) {
        var btn = "";
        if (data_countries[data_player].available_decisions.includes(decision)) {
            btn = `<img onclick="decision_entry_click('${decision}')" class="decision-button left-element" src="assets/texticons/yes.png"></img>`
        }
        else {
            btn = `<img class="decision-button left-element" src="assets/texticons/no.png"></img>`
        }
        $("#decision-tab").append(`<div onmouseover="decision_entry_over('${decision}')" onmouseout="clear_tooltip()" class="decision-tab-entry shadow"><b>${get_localisation(data_decisions[decision].title)}</b>${btn}</div>`);
    }
}
function politics_tab_generate() {
    $("#politics-tab").html("");
    var txt_main = "";
    var politics = data_countries[data_player].politics;
    for (person of politics.main_leaders) {
        if (is_position_vacant(person, data_player)) {
            txt_main += `<td style="width:${(100/politics.main_leaders.length).toPrecision(5)}%">
            <h2>${get_localisation(`$$this.position_title,${person}`)}</h2>
            <img class="shadow" style="width:100px" src="assets/portraits/unknown.png" />
            <br>
            <i>Vacant</i>
        </td>`
        }
        else {
            txt_main += `<td style="width:${(100/politics.main_leaders.length).toPrecision(5)}%">
            <h2>${get_localisation(`$$this.position_title,${person}`)}</h2>
            <img class="shadow" style="width:100px" src="${data_people[politics.positions[person].person].portrait}" />
            <br>
            ${get_localisation(data_people[politics.positions[person].person].name)}
        </td>`
        }
    }

    $("#politics-tab").append(`<table style="width:100%;table-layout:fixed;">
    <tr>${txt_main}</tr>
    </table>`)

    for (section in politics.sections) {
        var txt = "";
        var txt_title = "";
        var txt_portrait = "";
        var txt_name = "";
        var i = 0;
        for (person of politics.sections[section]) {
            if (is_position_vacant(person, data_player)) {
                txt_title += `<td style="width:33.333%">${get_localisation(`<b>$$this.position_title,${person}$$</b>`)}<br></td>`;
                txt_portrait += `<td style="width:33.333%"><img class="shadow" style="width:75px" src="assets/portraits/unknown.png" /></td>`
                txt_name += get_localisation(`<td style="width:33.333%"><i>Vacant</i></td>`);
            }
            else {
                txt_title += `<td style="width:33.333%">${get_localisation(`<b>$$this.position_title,${person}$$</b>`)}<br></td>`;
                txt_portrait += `<td style="width:33.333%"><img class="shadow" style="width:75px" src="${data_people[politics.positions[person].person].portrait}" /></td>`
                txt_name += get_localisation(`<td style="width:33.333%">$$this.position_tag,${person}.name$$</td>`);
            }
            if ((i+1) % 3 == 0) {
                txt += `<tr>${txt_title}</tr><tr>${txt_portrait}</tr><tr>${txt_name}</tr>`
                txt_title = "";
                txt_portrait = "";
                txt_name = "";
            }
            i++;
        }
        txt += `<tr>${txt_title}</tr><tr>${txt_portrait}</tr><tr>${txt_name}</tr>`
        $("#politics-tab").append(`<h2>${get_localisation(section, [data_player])}</h2><table style="width:100%;table-layout:fixed;">
        <tr>${txt}</tr>
        </table>`)
    }

}
function decision_entry_over(decision) {
    tooltip_text = `<b class="yellow-text">${get_localisation(data_decisions[decision].title)}</b><br>${get_localisation(data_decisions[decision].desc)}<br><br><u class="yellow-text">Available:</u><br>${run_trigger(data_decisions[decision].available, [data_player])[1]}<br><u class="yellow-text">Effects:</u><br>${run_effect(data_decisions[decision].effects, [data_player], true, false)}`;
} 
function decision_entry_click(decision) {
    clear_tooltip();
    fire_decision(decision, data_player);
}

function diplomacy_entry_over(tag) {
    map_style = "country_selected";
    map_style_context = tag;
    load_map_style();
}
function diplomacy_entry_out() {
    map_style = "country";
    map_style_context = "";
    load_map_style();
}
function open_tab(tab) {
    $(".left-panel-tab").hide();
    switch (tab) {
        case "decisions":
            decision_tab_generate();
            $("#decision-tab").show();
            break;
        case "politics":
            politics_tab_generate();
            $("#politics-tab").show();
            break;
        case "diplomacy":
            diplomacy_tab_generate();
            $("#diplomacy-tab").show();
            break;
        case "territory":
            $("#territory-tab").show();
            break;
    }
}
function get_localisation(text, scopes=[data_player]) {
    var out = "";
    if (text in localisation) {
        out = localisation[text];
    }
    else {
        out = text;
    }
    var elements = out.split("$$");
    var i = 0;
    for (element of elements) {
        if (i % 2 != 0) {
            var full = element.split('.');
            var left = get_token(full[0], scopes);
            for (func of full.slice(1)) {
                func = func.split(',');
                switch (func[0]) {
                    case "texticon":
                        left = text_icons[left];
                        break;
                    case "flag":
                        left = return_flag(data_countries[get_token(left, scopes)].flag, 25, 17);
                        break;
                    case "name":
                        switch (get_tag_type(get_token(left, scopes))) {
                            case "country":
                                left = get_localisation(data_countries[left].name);
                                break;
                            case "tile":
                                left = get_localisation(data_tiles[left].name);
                                break;
                            case "person":
                                left = get_localisation(data_people[left].name);
                                break;
                        }
                        break;
                    case "long_name":
                        left = get_localisation(data_countries[get_token(left, scopes)].long_name);
                        break;
                    case "country_adj":
                        left = get_localisation(data_countries[get_token(left, scopes)].adj);
                        break;
                    case "controller_tag":
                        left = data_tiles[get_token(left, scopes)].controller;
                        break;
                    case "tag_var":
                        left = get_token(data_variables[left][func[1]], scopes);
                        break;
                    case "position_title":
                        if ($.type(data_countries[get_token(left, scopes)].politics.positions[func[1]].title) === "string") {
                            left = get_localisation(data_countries[get_token(left, scopes)].politics.positions[func[1]].title, scopes);
                        }
                        else {
                            if (is_position_vacant(func[1], scopes[scopes.length-1])) {
                                left = get_localisation(data_countries[get_token(left, scopes)].politics.positions[func[1]].title[ 'neutral' ], scopes);
                            }
                            else {
                                left = get_localisation(data_countries[get_token(left, scopes)].politics.positions[func[1]].title[ data_people[data_countries[get_token(left, scopes)].politics.positions[func[1]].person].gender ?? 'nb' ], scopes);
                            }
                        }
                        break;
                    case "position_tag":
                        left = data_countries[get_token(left, scopes)].politics.positions[func[1]].person;
                        break;
                    case "portrait":
                        left = data_people[left].portrait;
                        break;

                    case "person_gender":
                        left = data_people[left].gender;
                        break;
                    
                    case "get_he_she_pronoun":
                        left = get_localisation("pronoun_"+left+"_he_she", scopes);
                        break;
                    case "get_him_her_pronoun":
                        left = get_localisation("pronoun_"+left+"_him_her", scopes);
                        break;
                    case "get_his_her_pronoun":
                        left = get_localisation("pronoun_"+left+"_his_her", scopes);
                        break;
                    case "get_his_hers_pronoun":
                        left = get_localisation("pronoun_"+left+"_his_hers", scopes);
                        break;
                    case "get_himself_herself_pronoun":
                        left = get_localisation("pronoun_"+left+"_himself_herself", scopes);
                        break;
                }
            }
            elements[i] = left;
        }
        i++;
    }
    out = elements.join('');
    return out;
}
$( document ).on( "mousemove", function( event ) {
    if (tooltip_text) {
        $("#tooltip").html(tooltip_text);
        $("#tooltip").show()
        $( "#tooltip" ).css({
            "left" : event.pageX,
            "top" : Math.max(event.pageY - $("#tooltip").height()-8, 0)
        });
    }
    else {
        $("#tooltip").hide()
    }
});

function logic_error_log(text) {
    console.log(`%c${text}`, 'background-color: red; color: white; font-weight:bold;')
    console.trace();
}

// CORE STUFF
$(window).on('load', function() {
    function load_data() {
        var maps = [];
        $.ajaxSetup({
            async: false
        });
        for (dir of mods) {
            dir = dir.replace('\\', '/')
            if (dir.charAt(dir.length- 1) != '/' && dir != '') {
                dir += '/'
            }
            $.getJSON(dir+"mod.json", function (mod_json) {
                if (mod_json.countries !== undefined) {
                    for (new_file of mod_json.countries) {
                        $.getJSON(dir+new_file, function (new_json) {
                            data_countries = {...data_countries, ...new_json};
                            console.log(`Loaded: ${dir}${new_file}`);
                        });
                    }
                }

                if (mod_json.map !== undefined) {
                    for (new_file of mod_json.map) {
                        $.getJSON(dir+new_file, function (new_json) {
                            data_tiles = {...data_tiles, ...new_json.tiles};
                            for (tile in data_tiles) {
                                data_tiles[tile].connections = data_tiles[tile].connections || [];
                            }

                            for (top2 in new_json.connections) {
                                for (tile of new_json.connections[top2]) {
                                    if (!(data_tiles[top2].connections.includes(tile))) {
                                        data_tiles[top2].connections.push(tile);
                                    }
                                    if (!(data_tiles[tile].connections.includes(top2))) {
                                        data_tiles[tile].connections.push(top2);
                                    }
                                }
                            }

                            console.log(`Loaded: ${dir}${new_file}`);
                        });
                    }
                }
                if (mod_json.people !== undefined) {
                    for (new_file of mod_json.people) {
                        $.getJSON(dir+new_file, function (new_json) {
                            data_people = {...data_people, ...new_json};
                            console.log(`Loaded: ${dir}${new_file}`);
                        });
                    }
                }
                if (mod_json.decisions !== undefined) {
                    for (new_file of mod_json.decisions) {
                        $.getJSON(dir+new_file, function (new_json) {
                            data_decisions = {...data_decisions, ...new_json};
                            console.log(`Loaded: ${dir}${new_file}`);
                        });
                    }
                }
                if (mod_json.events !== undefined) {
                    for (new_file of mod_json.events) {
                        $.getJSON(dir+new_file, function (new_json) {
                            data_events = {...data_events, ...new_json};
                            console.log(`Loaded: ${dir}${new_file}`);
                        });
                    }
                }
                if (mod_json.on_actions !== undefined) {
                    for (new_file of mod_json.on_actions) {
                        $.getJSON(dir+new_file, function (new_json) {
                            for (on_action in new_json) {
                                switch (on_action) {
                                    case "on_tile_controller_change":
                                        for (entry in new_json[on_action]) {
                                            for (tile of new_json[on_action][entry].tiles) {
                                                if (tile != "default") {
                                                    if (data_tiles[tile].on_tile_controller_change === undefined) {
                                                        data_tiles[tile].on_tile_controller_change = [];
                                                    }
                                                    
                                                    data_tiles[tile].on_tile_controller_change.push(new_json[on_action][entry].effects);
                                                }
                                                else {
                                                    data_on_actions["on_tile_controller_change_default"].push(new_json[on_action][entry].effects);
                                                }
                                            }
                                        }
                                        break;
                                }
                            }
                            console.log(`Loaded: ${dir}${new_file}`);
                        });
                    }
                }
                if (mod_json.localisation !== undefined) {
                    for (new_file of mod_json.localisation) {
                        $.getJSON(dir+new_file, function (new_json) {
                            localisation = {...localisation, ...new_json};
                            console.log(`Loaded: ${dir}${new_file}`);
                        });
                    }
                }
                if (mod_json.config !== undefined) {
                    $.getJSON(dir+mod_json.config, function (new_json) {
                        data_player = new_json.default_tag || data_player;
                        days = new_json.days || days;
                        months = new_json.months || months;
                        date = new_json.date-1 || date;
                        month = new_json.month || month;
                        year = new_json.year || year;
                        console.log(`Loaded: ${dir}${new_file}`);
                    });
                }
                if (mod_json.mapsvg !== undefined) {
                    maps.push(dir+mod_json.mapsvg);
                }
            });
        }
        for (person in data_people) {
            data_people[person].positions = {};
        }
        for (country in data_countries) {
            data_countries[country].color = data_countries[country].color || `#${Math.floor(Math.random()*16777215).toString(16)}`
            data_countries[country].name = data_countries[country].name || country;
            data_countries[country].adj = data_countries[country].adj || country+"_ADJ";
            if (country+"_long" in localisation) {
                data_countries[country].long_name = data_countries[country].long_name || country+"_long";
            }
            else {
                data_countries[country].long_name = data_countries[country].long_name || data_countries[country].name;
            }
            data_countries[country].flag = data_countries[country].flag || "assets/flags/blank.png";

            data_countries[country].politics = data_countries[country].politics || {
                "positions": {},
                "main_leaders": [],
                "government_members": [],
                "other_positions": []
            };

            for (position in data_countries[country].politics.positions) {
                if ( !(is_position_vacant(position, country)) ) {
                    var person = data_countries[country].politics.positions[position].person;
                    if (data_people[person].positions[country] === undefined) {
                        data_people[person].positions[country] = [position];
                    }
                    else {
                        data_people[person].positions[country].push(position);
                    }
                }
            }

            data_countries[country].original_name = data_countries[country].name;
            data_countries[country].original_long_name = data_countries[country].long_name;
            data_countries[country].allowed_decisions = [];
            data_countries[country].visible_decisions = [];
            data_countries[country].available_decisions = [];
            data_countries[country].controlled_tiles = [];
            data_countries[country].claimed_tiles = [];
        }
        $("#map-container").load(maps[maps.length-1], function() {
            console.log("Loaded map: "+maps[maps.length-1]);
        });
        for (key in data_tiles) {
            if (!data_tiles[key].name) {
                data_tiles[key].name = "tile_" + key;
            }
            $("#tile-"+key).attr('onclick', 'on_tile_click("'+key+'")');
            $("#tile-"+key).attr('onmouseover', 'on_tile_over("'+key+'")');
            $("#tile-"+key).attr('onmouseout', 'on_tile_out("'+key+'")');
            $("#tile-"+key).attr('data-tile', key);
            data_tiles[key].on_tile_controller_change = data_tiles[key].on_tile_controller_change || [];
            data_tiles[key].connections = data_tiles[key].connections || [];

            data_tiles[key].claims = data_tiles[key].claims || [];
            data_countries[data_tiles[key].controller].controlled_tiles.push(key);
            for (claim of data_tiles[key].claims) {
                data_countries[claim].claimed_tiles.push(key);
            }
        }
        for (decision in data_decisions) {
            for (country in data_countries) {
                if (run_trigger(data_decisions[decision].allowed, [country])[0]) {
                    data_countries[country].allowed_decisions.push(decision);
                }
            }
        }
        for (key in data_countries) {
            data_variables[key] = {};
        }
        for (key in data_people) {
            data_variables[key] = {};
        }
        for (key in data_tiles) {
            data_variables[key] = {};
        }
        $("svg").first().attr("id", "svg-map")
        load_player(data_player);
        do_turn();
        diplomacy_tab_generate();
        load_map_style();
        $("#svg-map").removeAttr("width");
        $("#svg-map").removeAttr("height");
        $("#svg-map").css("display", "block");
        $("#svg-map").css("margin", "auto");
        $("#svg-map").css("background-color", "green");
        panzoom(document.querySelector('#whole-map-container'), {
            maxZoom: 20,
            minZoom: 1,
            bounds: false,
            boundsPadding: 0,
            smoothScroll: false
        })
        document.body.onmousedown = function() { 
          ++mouseDown;
        }
        document.body.onmouseup = function() {
          --mouseDown;
        }
        $("#whole-map-container").css("width", `${document.getElementById("svg-map").getAttribute('viewBox').split(' ')[2]}px`);
        $("#whole-map-container").css("height", `${document.getElementById("svg-map").getAttribute('viewBox').split(' ')[3]}px`);
        for (tile in data_tiles) {
            if ($(`#point-${tile}`).length != 0) {
                $(`#point-${tile}`).addClass(`tile-points`);
                $(`#point-${tile}`).addClass(`debug-show`);
                for (conn of data_tiles[tile].connections) {
                    if ($(`#point-${conn}`).length != 0) {
                        var x_tile = 2*parseFloat($(`#point-${tile}`).attr('cx'));
                        var y_tile = 2*parseFloat($(`#point-${tile}`).attr('cy'));
                        var x_conn = 2*parseFloat($(`#point-${conn}`).attr('cx'));
                        var y_conn = 2*parseFloat($(`#point-${conn}`).attr('cy'));
                        document.getElementById("svg-lines").innerHTML += (`<line x1='${x_tile}' y1='${y_tile}' x2='${x_conn}' y2='${y_conn}' stroke='black' vector-effect='non-scaling-stroke' class="debug-show tile-line" id="line-${tile}-${conn}"/>`);
                    }
                }

                $("#map-icons").append(`<img id="icon-battle-${tile}" class="map-icon icon-battle" src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Explosion.svg" style="left:${$(`#point-${tile}`).attr('cx')*2-1.5}px;top:${$(`#point-${tile}`).attr('cy')*2-1.5}px;position:absolute;width:3px;"></img>`)
            }
        }
        $("#svg-lines").removeAttr("width");
        $("#svg-lines").removeAttr("height");
        $("#svg-lines").css("display", "block");
        $("#svg-lines").css("margin", "auto");
        $(".debug-show").hide()
        $(".icon-battle").hide()
    }
    load_data();
});

// LOGIC
function get_token(key, scopes) {
    if ($.type(key) !== "string") {
        return key;
    }
    else if (key.toLowerCase().substring(0, 4) == "prev") {
        return scopes[scopes.length-(1+parseInt(key.substring(4)))]; 
    }
    else if (key.includes(":")) {
        var scope = scopes[scopes.length-1];
        var type = key.substring(0, key.indexOf(":"));
        var token = key.substring(key.indexOf(":")+1);
        switch (type) {
            case "position":
                var position;
                if (token.includes('.')) {
                    position = token.split('.')[1];
                    scope = get_token(token.split('.')[0]);
                }
                else {
                    position = get_token(token, scopes);
                }
                if ( has_position(position, scope) ) {
                    if ( !(is_position_vacant(position, scope)) ) {
                        return data_countries[scope].politics.positions[position].person;
                    }
                    else {
                        logic_error_log(`Logic error: get_token(): "${position}" position for ${scope} is vacant`);
                        return scope;
                    }
                }
                else {
                    logic_error_log(`Logic error: get_token(): "${position}" position does not exist for ${scope}`);
                    return scope;
                }
            case "var":
                var variable;
                if (token.includes('.')) {
                    variable = token.split('.')[1];
                    scope = get_token(token.split('.')[0]);
                }
                return data_variables[scope][variable] || scope;
        }
        //if (key.includes(":var:")) {
        //    scope = get_token( key.substring(0, key.indexOf(":var:")), scopes );
        //}
        //return data_variables[scope][key.substring(key.indexOf("var:")+4)]; 
    }
    else {
        switch (key.toLowerCase()) {
            case "this":
                return scopes[scopes.length-1];
            default:
                return key;
        }
    }
}
function get_tag_type(key) {
    if (key in data_countries) {
        return "country";
    }
    else if (key in data_tiles) {
        return "tile";
    }
    else if (key in data_people) {
        return "person";
    }
    else {
        return "unknown";
    }
}
function get_position_title(position, scope, gender) {
    var loc = data_countries[scope].politics.positions[position].title;
    if ($.type(loc) === "string") {
        return loc;
    }
    else {
        return loc[gender] ?? (loc['nb'] ?? loc['m']);
    }
}
function run_effect(script, scopes, tooltip=true, execute=true, embed=0) {
    var tt = "";
    var emb;
    for (effect of script) {
        var scope = (effect.scope === undefined) ? scopes[scopes.length-1] : get_token(effect.scope, scopes); 
        var target = (effect.target === undefined) ? scopes[scopes.length-1] : get_token(effect.target, scopes);
        var short_tt = effect.short_tt ?? true;
        emb = '&nbsp;'.repeat(embed*6);
        switch (effect.type) {
            case 'set_tile_control':
                if ((target in data_tiles) && (scope in data_countries)) {
                    if (tooltip && !effect.no_tooltip) {
                        tt += get_localisation(short_tt ? `${emb}Becomes controller of <span class="yellow-text">$$${target}.name$$</span><br>` : `${emb}<span class="yellow-text">$$${scope}.flag$$ $$${scope}.name$$</span> becomes controller of <span class="yellow-text">$$${target}.name$$</span><br>`, scopes)
                    }
                    if (execute && !effect.no_execute) {
                        change_tile_controller(target, scope, scopes);
                    }
                }
                else {
                    if (!(target in data_tiles)) {
                        logic_error_log(`Logic error: set_tile_control: "${target}" not a valid tile`);
                    }
                    if (!(scope in data_countries)) {
                        logic_error_log(`Logic error: set_tile_control: "${scope}" not a valid country`);
                    }
                }
                break;
            case 'fire_event':
                var event = get_token(effect.event, scopes);
                if ((event in data_events) && (scope in data_countries)) {
                    var temp_scopes = scopes;
                    var turns = get_token(effect.turns, scopes);
                    if (scope != scopes[scopes.length-1]) {
                        temp_scopes.push(scope);
                    }
                    if (tooltip && !effect.no_tooltip) {
                        var temp = ""
                        if (turns !== undefined && turns != 0) {
                            temp = ` in ${turns} turns`;
                        }
                        tt += get_localisation(short_tt ? `${emb}Gets event <span class="yellow-text">${get_localisation(data_events[event].title)}</span>${temp}<br>` : `${emb}<span class="yellow-text">$$${scope}.flag$$ $$${scope}.name$$</span> gets event <span class="yellow-text">${get_localisation(data_events[event].title)}</span>${temp}<br>`, temp_scopes);
                    }
                    if (execute && !effect.no_execute) {
                    if (turns === undefined || turns == 0) {
                        fire_event(event, temp_scopes);
                    }
                    else {
                        if (!(turn+turns in schedule)) {
                            schedule[turn+turns] = {"events": []}
                        }
                        schedule[turn+turns].events.push({"id": event, "scopes": temp_scopes});
                    }
                    }
                }
                else {
                    if (!(event in data_events)) {
                        logic_error_log(`Logic error: fire_event: "${event}" not a valid event`);
                    }
                    if (!(scope in data_countries)) {
                        logic_error_log(`Logic error: fire_event: "${scope}" not a valid country`);
                    }
                }
                break;
            case 'set_variable':
                if (execute && !effect.no_execute) {
                    data_variables[scope][effect.variable] = get_token(effect.value, scopes) ?? true;
                }
                break;
            case 'if':
                var evald = run_trigger(effect.limit, scopes, embed+1);
                if (tooltip && !effect.no_tooltip) {
                    var label = (effect.label ?? false) ? get_localisation(effect.label) : `If:</span> ${evald[1]}${emb}<span class="yellow-text">Then`;
                    tt += `${emb}<span class="yellow-text">${label}:</span><br>${run_effect(effect.effects, scopes, true, false, embed+1)}`;
                }
                if (evald[0] && execute && !effect.no_execute) {
                    run_effect(effect.effects, scopes, false, true);
                }
                break;
            case 'scope':
                var effects = effect.effects;
                switch(effect.tag) {
                    case "every_tile":
                    case "every_country":
                    case "every_person":
                        var every = [];
                        var data;
                        var data_type;
                        switch (effect.tag) {
                            case "every_tile":
                                data = data_tiles;
                                data_type = "tile";
                                break;
                            case "every_country":
                                data = data_countries;
                                data_type = "country";
                                break;
                            case "every_person":
                                data = data_people;
                                data_type = "person";
                                break;
                        }
                        for (entry in data) {
                            if (effect.limit !== undefined) {
                                if (run_trigger(effect.limit, scopes.concat(entry))[0]) {
                                    every.push(entry);
                                }
                            }
                            else {
                                every.push(entry);
                            }
                        }
                        if (tooltip && !effect.no_tooltip) {
                            if (effect.label === undefined) {
                                switch (every.length) {
                                    case 0:
                                        break;
                                    case 1:
                                        if (data_type == "country") {
                                            tt += get_localisation(`${emb}<span class="yellow-text">$$${every[0]}.flag$$ $$${every[0]}.name$$:</span><br>${run_effect(effects, scopes.concat(every[0]), true, false, embed+1)}`)
                                        }
                                        else {
                                            tt += get_localisation(`${emb}<span class="yellow-text">$$${every[0]}.name$$:</span><br>${run_effect(effects, scopes.concat(every[0]), true, false, embed+1)}`)
                                        }
                                        break;
                                    case 2:
                                        if (data_type == "country") {
                                            tt += get_localisation(`${emb}<span class="yellow-text">$$${every[0]}.flag$$ $$${every[0]}.name$$ and $$${every[1]}.flag$$ $$${every[1]}.name$$:</span><br>${run_effect(effects, scopes.concat(every[0]), true, false, embed+1)}`)
                                        }
                                        else {
                                            tt += get_localisation(`${emb}<span class="yellow-text">$$${every[0]}.name$$ and $$${every[1]}.name$$:</span><br>${run_effect(effects, scopes.concat(every[0]), true, false, embed+1)}`)
                                        }
                                        break;
                                    case 3:
                                        if (data_type == "country") {
                                            tt += get_localisation(`${emb}<span class="yellow-text">$$${every[0]}.flag$$ $$${every[0]}.name$$, $$${every[1]}.flag$$ $$${every[1]}.name$$ and $$${every[2]}.flag$$ $$${every[2]}.name$$:</span><br>${run_effect(effects, scopes.concat(every[0]), true, false, embed+1)}`)
                                        }
                                        else {
                                            tt += get_localisation(`${emb}<span class="yellow-text">$$${every[0]}.name$$, $$${every[1]}.name$$ and $$${every[2]}.name$$:</span><br>${run_effect(effects, scopes.concat(every[0]), true, false, embed+1)}`)
                                        }
                                        break;
                                    default:
                                        if (data_type == "country") {
                                            tt += get_localisation(`${emb}<span class="yellow-text">$$${every[0]}.flag$$ $$${every[0]}.name$$, $$${every[1]}.flag$$ $$${every[1]}.name$$, $$${every[2]}.flag$$ $$${every[2]}.name$$ and ${every.length-3} others:</span><br>${run_effect(effects, scopes.concat(every[0]), true, false, embed+1)}`)
                                        }
                                        else {
                                            tt += get_localisation(`${emb}<span class="yellow-text">$$${every[0]}.name$$, $$${every[1]}.name$$, $$${every[2]}.name$$ and ${every.length-3} others:</span><br>${run_effect(effects, scopes.concat(every[0]), true, false, embed+1)}`)
                                        }
                                        break;

                                }
                            }
                            else {
                                tt += get_localisation(`${emb}<span class="yellow-text">${get_localisation(effect.label, scopes)}:</span><br>${run_effect(effects, scopes.concat(every[0]), true, false, embed+1)}`, scopes)
                            }
                        }
                        if (execute && !effect.no_execute) {
                            for (entry of every) {
                                run_effect(effects, scopes.concat(entry), false, true);
                            }
                        }
                        break;
                    
                    default: // Individual tag
                        var tag = get_token(effect.tag, scopes);
                        if (is_scope(tag, scopes)) {
                            if (tooltip && !effect.no_tooltip) {
                                if (effect.label === undefined) {
                                    if (get_tag_type(tag) == "country") {
                                        tt += get_localisation(`${emb}<span class="yellow-text">$$${tag}.flag$$ $$${tag}.name$$:</span><br>${run_effect(effects, scopes.concat(tag), true, false, embed+1)}`, scopes);
                                    }
                                    else {
                                        tt += get_localisation(`${emb}<span class="yellow-text">$$${tag}.name$$:</span><br>${run_effect(effects, scopes.concat(tag), true, false, embed+1)}`, scopes);
                                    }
                                }
                                else {
                                    tt += get_localisation(`${emb}<span class="yellow-text">${get_localisation(effect.label)}:</span><br>${run_effect(effects, scopes.concat(tag), true, false, embed+1)}`, scopes);
                                }
                            }
                            if (execute && !effect.no_execute) {
                                run_effect(effects, scopes.concat(tag), false, true)
                            }
                            break;     
                        }
                        else {
                            logic_error_log(`Logic error: ${effect.tag}: "${tag}" is not a valid scope`)
                            break;
                        }
                }
                break;
            case "set_country_long_name":
                if (tooltip && !effect.no_tooltip) {
                    tt += get_localisation(`${emb}<span class="yellow-text">$$${scope}.flag$$ $$${scope}.long_name$$</span> becomes the <span class="yellow-text">${get_localisation(get_token(effect.name, scopes), scopes)}</span><br>`, scopes);
                }
                if (execute && !effect.no_execute) {
                    if (effect.instance) {
                        data_countries[scope].long_name = get_localisation(get_token(effect.name, scopes), scopes);
                    }
                    else {
                        data_countries[scope].long_name = get_token(effect.name, scopes);
                    }
                    $("#player-title").html(get_localisation(data_countries[data_player].long_name));
                }
                break;
            case "set_country_name":
                if (tooltip && !effect.no_tooltip) {
                    tt += get_localisation(`${emb}<span class="yellow-text">$$${scope}.flag$$ $$${scope}.name$$</span> becomes the <span class="yellow-text">${get_localisation(get_token(effect.name, scopes), scopes)}</span><br>`, scopes);
                }
                if (execute && !effect.no_execute) {
                    if (effect.instance) {
                        data_countries[scope].name = get_localisation(get_token(effect.name, scopes), scopes);
                    }
                    else {
                        data_countries[scope].name = get_token(effect.name, scopes);
                    }
                }
                break;
            case "set_position_title":
                var position = get_token(effect.position, scopes);
                if (has_position(position, scope)) {
                    if (tooltip && !effect.no_tooltip) {
                        if ($.type(effect.title) === "string") {
                            tt += get_localisation(`${emb}The <span class="yellow-text">$$${scope}.position_title,${position}$$</span> position becomes the <span class="yellow-text">${get_localisation(effect.title, scopes)}</span><br>`, scopes);
                        }
                        else {
                            tt += get_localisation(`${emb}The <span class="yellow-text">$$${scope}.position_title,${position}$$</span> position becomes the <span class="yellow-text">${get_localisation((effect.title[data_people[data_countries[scope].politics.positions[position].person].gender]) ?? 'm', scopes)}</span><br>`, scopes);
                        }
                    }
                    if (execute && !effect.no_execute) {
                        data_countries[scope].politics.positions[position].title = effect.title;
                        if (scope == data_player) {
                            politics_tab_generate();
                        }
                    }
                }
                else {
                    logic_error_log(`Logic error: set_position_title: "${scope}" has no position "${position}"`);
                }
                break;
            case "set_position":
                var position = get_token(effect.position, scopes);
                var person = get_token(effect.person, scopes);
                if (has_position(position, scope)) {
                    if (tooltip && !effect.no_tooltip) {
                        if (!(person in data_people) || person === undefined || person.trim() == '') {
                            tt += get_localisation(`${emb}<span class="yellow-text">$$${person}.name$$</span> becomes <span class="yellow-text">vacant</span><br>`, scopes);
                        }
                        else {
                            tt += get_localisation(`${emb}<span class="yellow-text">$$${person}.name$$</span> becomes <span class="yellow-text">${get_localisation(get_position_title(position, scope, data_people[person].gender), scopes)}</span><br>`, scopes);
                        }
                    }
                    if (execute && !effect.no_execute) {
                        data_countries[scope].politics.positions[position].person = person;
                        if (scope == data_player) {
                            politics_tab_generate();
                        }
                    }
                }
                else {
                    logic_error_log(`Logic error: set_position: "${scope}" has no position "${position}"`);
                }
                break;
            case "set_person_gender":
                var person = get_token(effect.person, scopes);
                var gender = get_token(effect.gender, scopes);
                if (tooltip && !effect.no_tooltip) {
                    tt += get_localisation(`${emb}<span class="yellow-text">$$${person}.name$$</span> becomes <span class="yellow-text">${get_localisation("gender_"+gender, scopes)}</span><br>`, scopes);
                }
                if (execute && !effect.no_execute) {
                    data_people[person].gender = gender;
                }
                break;
            case "set_person_name":
                var person = get_token(effect.person, scopes);
                var name = get_token(effect.name, scopes);
                if (tooltip && !effect.no_tooltip) {
                    tt += get_localisation(`${emb}<span class="yellow-text">$$${person}.name$$</span> becomes <span class="yellow-text">${get_localisation(name, scopes)}</span><br>`, scopes);
                }
                if (execute && !effect.no_execute) {
                    data_people[person].name = name;
                }
                break;
            case "kill_person":
                if (tooltip && !effect.no_tooltip) {
                    tt += get_localisation(`${emb}<span class="yellow-text">$$${target}.name$$</span> dies<br>`, scopes);
                }
                if (execute && !effect.no_execute) {
                    kill_person(target);
                }
                break;
            default:
                logic_error_log(`Logic error: Effect "${effect.type}" does not exist`);
                break;
        }
    }
    return tt;
}
function run_trigger(trigger_block, scopes, embed=0, first=true) {
    var evaluation = false;
    var tt = "";
    var emb;
    if (trigger_block.not === undefined) {
        trigger_block.not = false;
    }
    var trigger_block_type = trigger_block.type || "and";
    switch (trigger_block_type) {
        case "and":
            evaluation = true;
            if (trigger_block.not) {
                tt = "<u>Not all of the following:</u><br>";
            }
            else {
                tt = "<u>All of the following:</u><br>"
            }
            break;
        case "or":
            evaluation = false;
            if (trigger_block.not) {
                tt = "<u>None of the following:</u><br>";
            }
            else {
                tt = "<u>At least one of the following:</u><br>";
            }
            break;
    }
    for (trigger of trigger_block.triggers) {
        var local = true;
        var tt2 = "";
        var scope = (trigger.scope === undefined) ? scopes[scopes.length-1] : get_token(trigger.scope, scopes); 
        var target = (trigger.target === undefined) ? scopes[scopes.length-1] : get_token(trigger.target, scopes);
        var short_tt = trigger.short_tt ?? true;
        emb = '&nbsp;'.repeat(embed*6);
        switch (trigger.type) {
            case 'always':
                tt2 = `Always true<br>`;
                local = true;
                break;
            case "controls_tile":
                tt2 = get_localisation(short_tt ? `Controls <span class="yellow-text">$$${target}.name$$</span><br>` : `<span class="yellow-text">$$${scope}.flag$$ $$${scope}.name$$</span> controls <span class="yellow-text">$$${target}.name$$</span><br>`, scopes);
                if (data_tiles[target].controller == scope) {
                    local = true;
                }
                else {
                    local = false; 
                }
                break;
            case "claims_tile":
                tt2 = get_localisation(short_tt ? `Claim <span class="yellow-text">$$${target}.name$$</span><br>` : `<span class="yellow-text">$$${scope}.flag$$ $$${scope}.name$$</span> claims <span class="yellow-text">$$${target}.name$$</span><br>`, scopes);
                if (data_tiles[target].claims.includes(scope)) {
                    local = true;
                }
                else {
                    local = false; 
                }
                break;
            case "controller":
                tt2 = get_localisation(short_tt ? `Controlled by <span class="yellow-text">$$${target}.flag$$ $$${target}.name$$</span><br>` : `<span class="yellow-text">$$${scope}.name$$</span> is controlled by <span class="yellow-text">$$${target}.flag$$ $$${target}.name$$</span><br>`, scopes);
                if (data_tiles[scope].controller == target) {
                    local = true;
                }
                else {
                    local = false; 
                }
                break;
            case "claimed_by":
                tt2 = get_localisation(short_tt ? `Claimed by <span class="yellow-text">$$${target}.flag$$ $$${target}.name$$</span><br>` : `<span class="yellow-text">$$${scope}.name$$</span> is claimed by <span class="yellow-text">$$${target}.flag$$ $$${target}.name$$</span><br>`, scopes);
                if (data_tiles[scope].claims.includes(target)) {
                    local = true;
                }
                else {
                    local = false; 
                }
                break;
            case "tag":
                tt2 = get_localisation(`Is <span class="yellow-text">$$${target}.flag$$ $$${target}.name$$</span><br>`, scopes);
                var tag = get_token(trigger.tag, scopes);
                if (tag == scope) {
                    local = true;
                }
                else {
                    local = false; 
                }
                break;
            case "and":
            case "or":
                var evald = run_trigger(trigger, scopes, embed+1, false);
                local = evald[0];
                tt2 = evald[1];
                break;
            case 'scope':
                var new_trigger = trigger.triggers;
                var limit = trigger.limit;
                switch(trigger.tag) {
                    case "any_tile":
                    case "any_country":
                    case "any_person":
                    case "all_tile":
                    case "all_country":
                    case "all_person":
                        var every = [];
                        var data;
                        var data_type;
                        var scope_type = trigger.tag.substring(0, 3);
                        switch (trigger.tag) {
                            case "any_tile":
                            case "all_tile":
                                data = data_tiles;
                                data_type = "tile";
                                break;
                            case "any_country":
                            case "all_country":
                                data = data_countries;
                                data_type = "country";
                                break;
                            case "any_person":
                            case "all_person":
                                data = data_people;
                                data_type = "person";
                                break;
                        }
                        for (entry in data) {
                            if (run_trigger(limit, scopes.concat(entry))[0]) {
                                every.push(entry);
                            }
                        }
                        if (tooltip && !trigger.no_tooltip) {
                            var data_type_c = data_type.charAt(0).toUpperCase() + data_type.slice(1);
                            var data_type_c2;
                            if (scope_type == "all") {
                                local = true;
                                data_type_c2 = "and";
                            }
                            else if (scope_type == "any") {
                                data_type_c2 = "or";
                                local = false;
                            }
                            var new_emb = '&nbsp;'.repeat((embed+1)*6);
                            if (trigger.label === undefined) {
                                switch (every.length) {
                                    case 0:
                                        break;
                                    case 1:
                                        if (data_type == "country") { 
                                            tt2 = get_localisation(`<span class="yellow-text">$$${every[0]}.flag$$ $$${every[0]}.name$$:</span><br>${new_emb}${run_trigger(new_trigger, scopes.concat(every[0]), embed+1, true)[1]}`)
                                        }
                                        else {
                                            tt2 = get_localisation(`<span class="yellow-text">$$${every[0]}.name$$:</span><br>${new_emb}${run_trigger(new_trigger, scopes.concat(every[0]), embed+1, true)[1]}`)
                                        }
                                        break;
                                    case 2:
                                        if (data_type == "country") {
                                            tt2 = get_localisation(`<span class="yellow-text">$$${every[0]}.flag$$ $$${every[0]}.name$$ ${data_type_c2} $$${every[1]}.flag$$ $$${every[1]}.name$$:</span><br>${new_emb}${run_trigger(new_trigger, scopes.concat(every[0]), embed+1, true)[1]}`)
                                        }
                                        else {
                                            tt2 = get_localisation(`${new_emb}<span class="yellow-text">$$${every[0]}.name$$ ${data_type_c2} $$${every[1]}.name$$:</span><br>${new_emb}${run_trigger(new_trigger, scopes.concat(every[0]), embed+1, true)[1]}`)
                                        }
                                        break;
                                    case 3:
                                        if (data_type == "country") {
                                            tt2 = get_localisation(`${new_emb}<span class="yellow-text">$$${every[0]}.flag$$ $$${every[0]}.name$$, $$${every[1]}.flag$$ $$${every[1]}.name$$ ${data_type_c2} $$${every[2]}.flag$$ $$${every[2]}.name$$:</span><br>${new_emb}${run_trigger(new_trigger, scopes.concat(every[0]), embed+1, true)[1]}`)
                                        }
                                        else {
                                            tt2 = get_localisation(`${new_emb}<span class="yellow-text">$$${every[0]}.name$$, $$${every[1]}.name$$ ${data_type_c2} $$${every[2]}.name$$:</span><br>${new_emb}${run_trigger(new_trigger, scopes.concat(every[0]), embed+1, true)[1]}`)
                                        }
                                        break;
                                    default:
                                        if (data_type == "country") {
                                            tt2 = get_localisation(`${new_emb}<span class="yellow-text">$$${every[0]}.flag$$ $$${every[0]}.name$$, $$${every[1]}.flag$$ $$${every[1]}.name$$, $$${every[2]}.flag$$ $$${every[2]}.name$$ ${data_type_c2} ${every.length-3} others:</span><br>${new_emb}${run_trigger(new_trigger, scopes.concat(every[0]), embed+1, true)[1]}`)
                                        }
                                        else {
                                            tt2 = get_localisation(`${new_emb}<span class="yellow-text">$$${every[0]}.name$$, $$${every[1]}.name$$, $$${every[2]}.name$$ ${data_type_c2} ${every.length-3} others:</span><br>${new_emb}${run_trigger(new_trigger, scopes.concat(every[0]), embed+1, true)[1]}`)
                                        }
                                        break;

                                }
                            }
                            else {
                                tt2 = get_localisation(`<span class="yellow-text">${get_localisation(effect.label, scopes)}:</span><br>${new_emb}${run_trigger(new_trigger, scopes.concat(every[0]), embed+1, true)[1]}`, scopes)
                            }
                        }
                        for (entry of every) {
                            var temp = run_trigger(new_trigger, scopes.concat(entry), embed+1, true)[0];
                            if (scope_type == "all") {
                                if (local && !temp) {
                                    local = false;
                                }
                            }
                            else if (scope_type == "any") {
                                if (temp) {
                                    local = true;
                                }
                            }
                        }
                        break;
                    
                    default: // Individual tag
                        var tag = get_token(trigger.tag, scopes);
                        if (tooltip && !trigger.no_tooltip) {
                            if (trigger.label === undefined) {
                                if (get_tag_type(tag) == "country") {
                                    tt2 = get_localisation(`<span class="yellow-text">$$${tag}.flag$$ $$${tag}.name$$:</span><br>${run_trigger(new_trigger, scopes.concat(tag), embed+1, true)[1]}`, scopes);
                                }
                                else {
                                    tt2 = get_localisation(`<span class="yellow-text">$$${tag}.name$$:</span><br>${run_trigger(new_trigger, scopes.concat(tag), embed+1, true)[1]}`, scopes);
                                }
                            }
                            else {
                                tt2 = get_localisation(`<span class="yellow-text">${get_localisation(trigger.label)}:</span><br>${run_trigger(new_trigger, scopes.concat(tag), embed+1, true)[1]}`, scopes);
                            }
                        }
                        local = run_trigger(new_trigger, scopes.concat(tag), embed+1, true)[0];
                        break;        
                }
                break;

        }
        if (local) {
            tt += `${emb}${text_icons["true"]} ${tt2}`;
            switch (trigger_block_type) {
                case "or":
                    evaluation = true;
                    break;
            }
        }
        else {
            tt += `${emb}${text_icons["false"]} ${tt2}`;
            switch (trigger_block_type) {
                case "and":
                    evaluation = false;
                    break;
            }
        }
    }
    if (trigger_block.not) {
        evaluation = !evaluation;
    }
    if (first) {
        if (evaluation) {
            tt = `${text_icons["true"]} ${tt}`
        }
        else {
            tt = `${text_icons["false"]} ${tt}`
        }
    }
    return [evaluation, tt];
}
function do_turn() {
    turn++;
    date++;
    if (date == months[month]+1) {
        date = 1;
        var temp = Object.keys(months).indexOf(month) + 1;
        if (temp == Object.keys(months).length) {
            temp = 0;
            year++;
        }
        month = Object.keys(months)[temp];
    }
    $("#date").html(`${get_localisation(days[turn % days.length], [])} ${date} ${get_localisation(month, [])} ${year}`);
    if (turn in schedule) {
        for (scheduledEvent in schedule[turn].events) {
            fire_event(schedule[turn].events[scheduledEvent].id, schedule[turn].events[scheduledEvent].scopes);
        }
    }
    evaluate_decisions();
}
function evaluate_decisions() {
    for (country in data_countries) {
        data_countries[country].visible_decisions = [];
        data_countries[country].available_decisions = [];
        for (decision of data_countries[country].allowed_decisions) {
            if (run_trigger(data_decisions[decision].visible, [country])[0]) {
                data_countries[country].visible_decisions.push(decision);
                if (run_trigger(data_decisions[decision].available, [country])[0]) {
                    data_countries[country].available_decisions.push(decision);
                }
            }
        }
    }
    decision_tab_generate();
}

// CONTENT RELATED STUFF
function event_option(event_id, option) {
    run_effect( data_events[ fired_events[event_id]["event"] ].options[option].effects, fired_events[event_id]["scopes"], false, true );
}
function fire_event(event, scopes) {
    console.log(event, scopes);
    var event_id = Object.keys(fired_events).length + 1;
    fired_events[event_id] = { "event": event, "scopes": scopes }
    if (data_events[event].immediate !== undefined) {
        run_effect(data_events[event].immediate, scopes, false, true);
    }
    if (get_token(scopes[scopes.length-1], scopes) == data_player) {
        pause();
        var opts = ""
        var i = 0;
        data_events[ event ].options.forEach(option => {
            opts += `<br><div class="event-option shadow" id="event-${event_id}-option-${i}" data-option=${i} data-event=${event_id}><b>${get_localisation(data_events[ event ].options[i].name)}</b></div>`
            i += 1;
        });
        var eventhtml = `<div id="event-${event_id}" class="event shadow">
            <h2>${get_localisation( data_events[ event ].title )}</h2>
            ${get_localisation( data_events[ event ].desc )}<br>
            ${opts}
        </div>`
        $("#events").append(eventhtml);
        i = 0;
        data_events[ event ].options.forEach(option => {
            $(`#event-${event_id}-option-${i}`).click(function() { event_option_button($(this)) });
            $(`#event-${event_id}-option-${i}`).mouseover(function() { on_event_option_over($(this)) });
            $(`#event-${event_id}-option-${i}`).mouseout(function() { clear_tooltip() });
            i += 1;
        });
        $(`#event-${event_id}`).on('mousedown', handle_mousedown);
        $(`#event-${event_id}`).css('left', `${$(window).width()/2-225}px`);
        $(`#event-${event_id}`).css('top', `${$(window).height()/2-($(`#event-${event_id}`).height()/2)}px`);
    }
    else {
        var chance = {}
        for (option in data_events[event].options) {
            chance[option] = 0;
            var ai = data_events[event].options[option].ai;
            for (entry in ai) {
                switch (ai[entry].type) {
                    case "add":
                        chance[option] += ai[entry].value;
                        break;
                }
            }
        }
        var total = 0;
        for (option in chance) {
            total += chance[option];
        }
        for (option in chance) {
            chance[option] /= total;
        }
        var running = 0;
        var chosen = -1;
        var option = 0;
        var select = Math.random();
        while (chosen == -1) {
            if (select > running && select < running + chance[option]) {
                chosen = option;
            }
            else {
                running += chance[option];
            }
            option++;
        }
        event_option(event_id, chosen);
    }
}
function fire_decision(decision, tag) {
    run_effect(data_decisions[decision].effects, [tag], false, true);
    if (data_decisions[decision].fire_only_once) {
        data_countries[tag].allowed_decisions.splice(data_countries[tag].allowed_decisions.indexOf(decision), 1); 
    }
    evaluate_decisions();
}
function change_tile_controller(tile, controller) {
    var old_controller = data_tiles[tile].controller;
    data_tiles[tile].controller = controller;
    if (data_tiles[tile].on_tile_controller_change !== undefined) {
        for (entry of data_tiles[tile].on_tile_controller_change) {
            run_effect(entry, [old_controller, controller, tile], false, true);
        }
    }
    for (entry of data_on_actions["on_tile_controller_change_default"])
        run_effect(entry, [old_controller, controller, tile], false, true);
    
    tile_style(tile);
}
function change_tile_claim(tile, claimant) {
    data_tiles[tile].claims.push(claimant);
    //if (data_tiles[tile].on_tile_controller_change !== undefined) {
    //    for (entry of data_tiles[tile].on_tile_controller_change) {
    //        run_effect(entry, [old_controller, controller, tile], false, true);
    //    }
    //}
    //for (entry of data_on_actions["on_tile_controller_change_default"])
    //    run_effect(entry, [old_controller, controller, tile], false, true);
    //
    tile_style(tile);
}
function has_position(position, tag) {
    return position in data_countries[tag].politics.positions;
}
function is_position_vacant(position, tag) {
    var pers = data_countries[tag].politics.positions[position].person;
    if (!(pers in data_people) || pers === undefined || pers.trim() == '') {
        return true;
    }
    else {
        return false;
    }
}
function is_scope(key, scopes) {
    var scope = get_token(key, scopes);
    return (scope in data_tiles || scope in data_countries || scope in data_people );
}
function clear_position(position, tag) {
    var person = data_countries[tag].politics.positions[position].person;
    data_people[person].positions[tag].splice(data_people[person].positions[tag].indexOf(position), 1);
    data_countries[tag].politics.positions[position].person = "";
    politics_tab_generate();
}
function kill_person(person) {
    for (tag in data_people[person].positions) {
        for (position of data_people[person].positions[tag]) {
            clear_position(position, tag);
        }
    }
    politics_tab_generate();
}
