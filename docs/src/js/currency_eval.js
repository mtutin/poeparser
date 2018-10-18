
function request_currency_offers(want, have, prices) {
    var url = 'http://currency.poe.trade/search?league=Delve&online=x&stock=&want='+want+'&have='+have

    return $.get('https://allorigins.me/get?method=raw&url=' + encodeURIComponent(url), function(data) {
        parser=new DOMParser();
        xmlDoc=parser.parseFromString(data, 'text/html');

        var divTags = xmlDoc.documentElement.querySelectorAll ("div[data-username]");

        var first_range = Math.ceil(divTags.length * 0.1);
        var second_range = Math.ceil(divTags.length * 0.2);

        var rates = [[],[],[]];
        for (var i = 0; i < divTags.length; i++) {
            var offer_sell = parseFloat(divTags[i].getAttribute('data-sellvalue'));
            var offer_buy = divTags[i].getAttribute('data-buyvalue');

            if(i<first_range) {
                rates[0].push(offer_buy/offer_sell);
            }
            else if(i >= first_range && i < second_range) {
                rates[1].push(offer_buy/offer_sell);
            }
            else {
                rates[2].push(offer_buy/offer_sell);
            }
        }

        var rates_avg = [];
        for(var j = 0;j<3;j++) {
            var tmp=0;
            for(i=0;i < rates[j].length;i++) {
                tmp += rates[j][i];
            }
            tmp /= rates[j].length;
            rates_avg.push(tmp);
        }

        var record = {
            "want":want,
            "have":have,
            "offers":divTags.length,
            "range1":rates_avg[0],
            "range2":rates_avg[1],
            "range3":rates_avg[2]
        }
        prices.push(record);
    });
}

function request_currency_list(curr_list) {
    return $.get('https://allorigins.me/get?method=raw&url=' + encodeURIComponent('http://currency.poe.trade'), function(data) {
        parser=new DOMParser();
        xmlDoc=parser.parseFromString(data, 'text/html');

        var offect_cat_tag = xmlDoc.documentElement.querySelector("#cat-want-0");
        var divTags = offect_cat_tag.querySelectorAll ("div[data-title]");
        for (var i = 0; i < divTags.length; i++) {
            curr_list.push({
                "name":divTags[i].getAttribute('title'),
                "short_name":divTags[i].getAttribute('data-title'),
                "id":divTags[i].getAttribute('data-id')});
        }
    });
}

function find_currency_id_by_name(currency_list, curr) {
    for(var i=0;i<currency_list.length;i++) {
        if(currency_list[i].short_name.search(curr) >= 0) {
            return currency_list[i].id;
        }
    }

    return null;
}

function find_currency_name_by_id(currency_list, id) {
    for(var i=0;i<currency_list.length;i++) {
        if(currency_list[i].id == id) {
            return currency_list[i].short_name;
        }
    }

    return null;
}

function find_rate(want,have,prices){
    for(var i=0;i<prices.length;i++) {
        if(prices[i].want == want && prices[i].have == have) {
            return prices[i];
        }
    }

    return null;
}

function find_next_link_in_chain(array, curr_chain, max_depth, chains) {
    chains.push(curr_chain.slice());
    if(curr_chain.length == max_depth) {
        return;
    }

    for(var i=0;i<array.length;i++){
        var already_there = false;
        for(var j=0;j<curr_chain.length;j++){
            if(curr_chain[j] == array[i]) {
                already_there = true;
                break;
            }
        }

        if(already_there) {
            continue;
        }

        curr_chain.push(array[i]);
        find_next_link_in_chain(array, curr_chain, max_depth, chains);
        curr_chain.pop();
    }
}
function compose_trade_chains(curr_to_invest, curr_to_eval, max_len) {
    var chains = [];

    for(var i=0;i<curr_to_eval.length;i++) {
        var curr_chain = [];
        curr_chain.push(curr_to_eval[i]);
        
        find_next_link_in_chain(curr_to_eval, curr_chain, max_len, chains);
    }

    for(var i=0;i<chains.length;i++) {
        chains[i].unshift(curr_to_invest);
        chains[i].push(curr_to_invest);
    }

    return chains;
}

function currency_eval() {
    var currency_list = [];
    request_currency_list(currency_list).done(function(){
        //console.log(currency_list);
        var curr_to_invest = find_currency_id_by_name(currency_list, 'chaos');
        var curr_to_eval = [
            find_currency_id_by_name(currency_list, 'alchemy'),
            find_currency_id_by_name(currency_list, 'fusing'),
            find_currency_id_by_name(currency_list, 'gcp'),
            find_currency_id_by_name(currency_list, 'chisel'),
            find_currency_id_by_name(currency_list, 'scouring')
        ];

        var trade_chains = compose_trade_chains(curr_to_invest, curr_to_eval, 2);

        var prices = [];
        var req_currency_offers = [];
        for(var i=0;i<trade_chains.length;i++) {
            for(var j=1;j<trade_chains[i].length;j++) {
                var r = request_currency_offers(trade_chains[i][j-1], trade_chains[i][j], prices);
                req_currency_offers.push(r);
            }
        }

        $.when.apply($, req_currency_offers).done(function(){
            var amount_to_invest = 100;

            var table_str = "<table>";
            for(var i=0;i<trade_chains.length;i++){
                table_str += "<tr><td>"
                var value = amount_to_invest;
                table_str += find_currency_name_by_id(currency_list, trade_chains[i][0]);
                for(var j=1;j<trade_chains[i].length;j++) {
                    var rate = find_rate(trade_chains[i][j-1], trade_chains[i][j], prices);
                    table_str += " =&gt; " + find_currency_name_by_id(currency_list, trade_chains[i][j]) + " [offers " + rate.offers + "]";
                    value *= rate.range1;
                }
                table_str += "</td><td>";
                table_str += value - amount_to_invest;
                table_str += "</td></tr>"
            }
            table_str += "</table>";
            
            $("#currency_eval_results").html(table_str);
        });
    });   
    
}