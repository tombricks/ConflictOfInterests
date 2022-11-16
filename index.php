<!DOCTYPE html>
<html>
    <head>
        <title>Conflict of Interests</title>
        <link rel="stylesheet" href="styles.css">
        <script src="scripts/jquery-3.6.1.js"></script>
        <script src="scripts/jquery.svg.pan.zoom.js"></script>
        <?php
        if (isset($_GET["mods"])) {
            $mods = explode(',', $_GET["mods"]);
            $mods = array_merge([""], $mods);
        }
        else {
            $mods = [""];
        }
        ?>
        <script> var mods = <?php echo json_encode($mods); ?>;</script>
        <script src="scripts/main.js"></script>
    </head>
    <body>
        <div style="width: 100%; overflow: hidden;">
            <div id="left-panel">
                <div id="top-bar" class="left-element" style="background-color:var(--CoI_dark_grey);width:100%;height:108px">
                    <h2 id="player-title" class="left-element" style="top:0px;left:100px;width:420px;height:32px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></h2>
                    <div id="player-flag-box" class="left-element shadow" style="top:8px;left:8px;width:82px;  height:52px">
                        <img id="player-flag" class="left-element" style="width:82px;height:52px"></img>
                        <img id="player-flag-overlay" class="left-element" style="width:82px;height:52px"   src="assets/interface/flag_overlay.png"></img>
                    </div>
                    <div id="top-bar-buttons" class="left-element" style="width:100%;top:68px;left:0px;">
                        <button onclick="open_tab('decisions')" class="tab-button shadow">Decisions</button><button onclick="open_tab('politics')" class="tab-button shadow">Politics</button><button onclick="open_tab('diplomacy')" class="tab-button shadow">Diplomacy</button><button onclick="open_tab('territory')" class="tab-button shadow">Territory</button>
                    </div>
                </div>
                <div id="left-tabs" style="overflow-x:hidden">
                    <div id="decision-tab" class="left-element left-panel-tab" style="display:none">decisions</div>
                    <div id="politics-tab" class="left-element left-panel-tab" style="display:none;text-align:center">politics</div>
                    <div id="diplomacy-tab" class="left-element left-panel-tab" style="display:none"></div>
                    <div id="territory-tab" class="left-element left-panel-tab" style="display:none">territory</div>
                </div>
            </div>
            <div id="right-panel">
                <div id="map-container">
                </div>
                <div id="turn-box" style="position:absolute;right:8px;top:8px;width:256px;height:96px;background:red;text-align:center;padding:8px;">
                    <b id="date">gayday 69 gayember 6969</b>
                    <br>
                    <br>
                    <!-- <button id="next-turn" onclick="do_turn()" style="position:absolute;right:8px;top:8px;">Next Turn</button> -->
                    <button>Unpause</button>
                    <button onclick="do_turn()">Next Turn</button>
                    <br>
                    <input type="radio" name="speed" for="1"></input>
                    <input type="radio" name="speed" for="2"></input>
                    <input type="radio" name="speed" for="3"></input>
                    <input type="radio" name="speed" for="4"></input>
                    <input type="radio" name="speed" for="5"></input>
                </div>
            </div>
        </div>
        <div id="events">
        </div>
        <div id="tooltip" class="shadow" style="display: none;"></div>
    </body>
</html>