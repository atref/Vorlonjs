module VORLON {

    export class XHRPanelClient extends ClientPlugin {
        public hooked: boolean = false;
        public cache: Array<NetworkEntry> = [];
        private _previousOpen;
        private _previousSetRequestHeader;

        constructor() {
            super("xhrPanel");
            this._id = "XHRPANEL";
            this._ready = false;        
        }
            
        public refresh(): void {
            this.sendStateToDashboard();
            this.sendCacheToDashboard();
        }

        public sendStateToDashboard() {
            this.sendCommandToDashboard('state', { hooked: this.hooked });
        }

        public sendCacheToDashboard() {
            for (var i = 0, l = this.cache.length; i < l; i++) {
                this.sendCommandToDashboard('xhr', this.cache[i]);
            }
        }

        public clearClientCache() {
            this.cache = [];
        }

        // This code will run on the client //////////////////////

        public startClientSide(): void {
            //this.setupXMLHttpRequestHook();
        }

        public onRealtimeMessageReceivedFromDashboardSide(receivedObject: any): void {            
        }

        public setupXMLHttpRequestHook(){
            var that = this;
            var xhrSource;
            
            if (!Tools.IsWindowAvailable) {
                xhrSource = require("xhr2");
            } else {
                xhrSource = XMLHttpRequest;
            }

            var data = {
                id: VORLON.Tools.CreateGUID(),
                url: null,
                status : null,
                statusText : null,
                method: null,
                responseType: null,
                responseHeaders : null,
                requestHeaders : [],
                readyState: 0,
            }
            this.cache.push(data);
            this._previousOpen = xhrSource.prototype.open;
            this._previousSetRequestHeader = xhrSource.prototype.setRequestHeader;
            
            //todo catch send to get posted data
            //see https://msdn.microsoft.com/en-us/library/hh772834(v=vs.85).aspx
            
            xhrSource.prototype.open = function() {
                data.id = VORLON.Tools.CreateGUID();
                data.method = arguments[0];
                data.url = arguments[1];
                that.trace('request for ' + data.url);
                that.sendCommandToDashboard('xhr', data);
                
                this.addEventListener('readystatechange', function() {
                    var xhr = this;
                    data.readyState = xhr.readyState;
                    that.trace('STATE CHANGED ' + data.readyState);

                    if (data.readyState === 4){
                        data.responseType = xhr.responseType;
                        data.status = xhr.status;    
                        data.statusText = xhr.statusText;
                        
                        if (xhr.getAllResponseHeaders)     
                            data.responseHeaders = xhr.getAllResponseHeaders();
                        
                        that.trace('LOADED !!!');
                    }
                    that.sendCommandToDashboard('xhr', data);
                });
                
                return that._previousOpen.apply(this, arguments);
            }
            
            xhrSource.prototype.setRequestHeader = function() {
                var header = {
                    name : arguments[0],
                    value : arguments[1]
                }
                data.requestHeaders.push(header);
                return this._previousSetRequestHeader.apply(this, arguments);
            }

            this.hooked = true;
            this.sendStateToDashboard();
        }

        public removeXMLHttpRequestHook() {
            if (this.hooked) {
                this.trace('xhrPanel remove hook');
                
                var xhrSource;
            
                if (!Tools.IsWindowAvailable) {
                    xhrSource = require("xhr2");
                } else {
                    xhrSource = XMLHttpRequest;
                }
                
                xhrSource.prototype.open = this._previousOpen;
                xhrSource.prototype.setRequestHeader = this._previousSetRequestHeader;
                
                this.hooked = false;
                this.sendStateToDashboard();
            }
        }

        private _render(tagname: string, parentNode:HTMLElement, classname?:string, value?: string): HTMLElement {
            var elt = document.createElement(tagname);
            elt.className = classname || '';
            if (value)
                elt.innerHTML = value;
            parentNode.appendChild(elt);
            return elt;
        }
    }

    XHRPanelClient.prototype.ClientCommands = {
        start: function (data: any) {
            var plugin = <XHRPanelClient>this;
            plugin.setupXMLHttpRequestHook();
        },
        stop: function (data: any) {
            var plugin = <XHRPanelClient>this;
            plugin.removeXMLHttpRequestHook();
        },
        getState: function (data: any) {
            var plugin = <XHRPanelClient>this;
            plugin.sendStateToDashboard();
        },
        clear: function (data: any) {
            var plugin = <XHRPanelClient>this;
            plugin.clearClientCache();
        }
    };
    
    //Register the plugin with vorlon core
    Core.RegisterClientPlugin(new XHRPanelClient());
}
