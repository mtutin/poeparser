
class TradeLog {
    constructor() {
        this.currentClientInstance = null;

        this.activeRequests = [];

        this.trade = [];
    }
    processEvent(datetime, clientInstance, msg) {
        if (this.currentClientInstance != clientInstance) {
            this.activeRequests = [];
            this.currentClientInstance = clientInstance;
        }

        if (msg.search("Trade accepted") != -1) {
            this.acceptTrade();
            return true;
        }
        else {
            var patterns = [
                new RegExp('(@.*) .*: .*to buy your (.*) listed for (.*) in .*'),
                new RegExp('(@.*) .*: .*to buy your (.*) for my (.*) in .*'),
            ];
            for (var p = 0; p < patterns.length; p++) {
                var tradeRequestRes = patterns[p].exec(msg);
                if (tradeRequestRes != null) {
                    if (tradeRequestRes[1] == "@To") {
                        this.outgoingRequest(datetime, tradeRequestRes[2], tradeRequestRes[3]);
                        return true;
                    }
                    else if (tradeRequestRes[1] == "@From") {
                        this.incomingRequest(datetime, tradeRequestRes[2], tradeRequestRes[3]);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    acceptTrade() {
        if (this.activeRequests.length > 0) {
            this.trade.push(this.activeRequests.pop());
        }
    }

    outgoingRequest(datetime, item, price) {
        this.activeRequests.push(['buy', datetime, item, price]);
    }

    incomingRequest(datetime, item, price) {
        this.activeRequests.push(['sell', datetime, item, price]);
    }
}


function parse_file(fileobj) {
    var reader = new FileReader();

    reader.onloadstart = function () {
        $("#file_open_status").addClass('running');
        $("#file_selection").prop("disabled", true);

        $("#file_open_status span").text("Parsing this file. Be patient...");
    }

    reader.onloadend = function (evt) {
        if (evt.target.readyState == FileReader.DONE) {
            let tradeLog = new TradeLog();

            var regex = new RegExp('(.*) \\d+ a34 \\[INFO Client (\\d+)\\] (.*)');
            var lines = evt.target.result.split('\n');
            for (var line = 0; line < lines.length; line++) {
                var str = lines[line];
                var res = regex.exec(str);
                if (res != null) {
                    if (tradeLog.processEvent(res[1], res[2], res[3]) == true) {
                        continue;
                    }
                }
            }

            table_content = "<thead><tr><th>Date</th><th>Buy/Sell</th><th>Item</th><th>Price</th></tr></thead>"
			table_content += "<tbody>"
            for (var i = tradeLog.trade.length - 1; i >= 0; i--) {
                var r = tradeLog.trade[i];
                if (r[0] == 'buy') {
                    table_content += "<tr class='buy'><td>" + r[1] + "</td><td>" + r[0] + "</td><td>" + r[2] + "</td><td class='loss'>-" + r[3] + "</td></tr>"
                }
                else
                    table_content += "<tr class='sell'><td>" + r[1] + "</td><td>" + r[0] + "</td><td>" + r[2] + "</td><td class='gain'>+" + r[3] + "</td></tr>"
            }
			table_content += "</tbody>"

            $("#trade_results_table").html(table_content);
        }

        $("#file_open_status").removeClass('running');
        $("#file_selection").prop("disabled", false);
        $("#file_open_status span").text("");
		
		$("#trade_results_section").removeClass('hidden');
    }
    reader.readAsText(fileobj)
}