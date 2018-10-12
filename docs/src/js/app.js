$(document).ready(function () {
    $("#log_file_to_parse").change(function (evt) {
        for (var i = 0, f; f = evt.target.files[i]; i++) {
            parse_file(f);
        }
    });
})