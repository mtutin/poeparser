
function request_currency_offers(want, have, prices) {
    var url = 'http://currency.poe.trade/search?league=Delve&online=x&stock=&want='+want+'&have='+have

    return $.get('https://allorigins.me/get?method=raw&url=' + encodeURIComponent(url), function(data) {
        parser=new DOMParser();
        xmlDoc=parser.parseFromString(data, 'text/html');

        var divTags = xmlDoc.documentElement.querySelectorAll ("div[data-username]");

        var first_range = Math.round(divTags.length * 0.1);
        var second_range = Math.round(divTags.length * 0.2);

        var rates = [[],[],[]];
        for (i = 0; i < divTags.length; i++) {
            var offer_sell = parseFloat(divTags[i].getAttribute('data-sellvalue'));
            var offer_buy = divTags[i].getAttribute('data-buyvalue');

            if(i<first_range) {
                rates[0].push(offer_sell/offer_buy);
            }
            else if(i >= first_range && i < second_range) {
                rates[1].push(offer_sell/offer_buy);
            }
            else {
                rates[2].push(offer_sell/offer_buy);
            }
        }

        var rates_avg = [];
        for(j = 0;j<3;j++) {
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

function currency_eval() {
    var prices = [];

    $.when(
        request_currency_offers(4, 3, prices),
        request_currency_offers(5, 4, prices),
        request_currency_offers(3, 6, prices)
        ).done(function() {
            console.log(prices);
        });
    //request_currency_offers(4, 3, prices);
}