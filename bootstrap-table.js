/**
 * @author zhixin wen <wenzhixin2010@gmail.com>
 * version: 1.2.0
 * https://github.com/wenzhixin/bootstrap-table/
 */
jQuery(document).ready(function(){
!function (jQuery) {

    'use strict';

    // TOOLS DEFINITION
    // ======================

    // it only does '%s', and return '' when arguments are undefined
    var sprintf = function(str) {
        var args = arguments,
            flag = true,
            i = 1;

        str = str.replace(/%s/g, function () {
            var arg = args[i++];

            if (typeof arg === 'undefined') {
                flag = false;
                return '';
            }
            return arg;
        });
        if (flag) {
            return str;
        }
        return '';
    };

    var getPropertyFromOther = function (list, from, to, value) {
        var result = '';
        jQuery.each(list, function (i, item) {
            if (item[from] === value) {
                result = item[to];
                return false;
            }
            return true;
        });
        return result;
    };

    var getScrollbarWidth = function () {
        var inner = jQuery('<p/>').addClass('fixed-table-scroll-inner'),
            outer = jQuery('<div/>').addClass('fixed-table-scroll-outer'),
            w1, w2;

        outer.append(inner);
        jQuery('body').append(outer);

        w1 = inner[0].offsetWidth;
        outer.css('overflow', 'scroll');
        w2 = inner[0].offsetWidth;

        if (w1 == w2) {
            w2 = outer[0].clientWidth;
        }

        outer.remove();
        return w1 - w2;
    };

    // BOOTSTRAP TABLE CLASS DEFINITION
    // ======================

    var BootstrapTable = function (el, options) {
        this.options = options;
        this.jQueryel = jQuery(el);
        this.jQueryel_ = this.jQueryel.clone();
        this.timeoutId_ = 0;

        this.init();
    };

    BootstrapTable.DEFAULTS = {
        classes: 'table table-hover',
        height: undefined,
        undefinedText: '-',
        sortName: undefined,
        sortOrder: 'asc',
        striped: false,
        columns: [],
        data: [],
        method: 'get',
        url: undefined,
        contentType: 'application/json',
        queryParams: function (params) {return {};},
        queryParamsType: undefined,
        responseHandler: function (res) {return res;},
        pagination: false,
        sidePagination: 'client', // client or server
        totalRows: 0, // server side need to set
        pageNumber: 1,
        pageSize: 10,
        pageList: [10, 25, 50, 100],
        search: false,
        selectItemName: 'btSelectItem',
        showHeader: true,
        showColumns: false,
        showRefresh: false,
        showToggle: false,
        minimumCountColumns: 1,
        idField: undefined,
        cardView: false,
        clickToSelect: false,
        singleSelect: false,
        toolbar: undefined,
        checkboxHeader: true,

        rowStyle: function (row, index) {return {};},

        formatLoadingMessage: function () {
            return 'Loading, please wait…';
        },
        formatRecordsPerPage: function (pageNumber) {
            return sprintf('%s records per page', pageNumber);
        },
        formatShowingRows: function (pageFrom, pageTo, totalRows) {
            return sprintf('Showing %s to %s of %s rows', pageFrom, pageTo, totalRows);
        },
        formatSearch: function () {
            return 'Search';
        },
        formatNoMatches: function () {
            return 'No matching records found';
        },

        onAll: function (name, args) {return false;},
        onClickRow: function (item, jQueryelement) {return false;},
        onDblClickRow: function (item, jQueryelement) {return false;},
        onSort: function (name, order) {return false;},
        onCheck: function (row) {return false;},
        onUncheck: function (row) {return false;},
        onCheckAll: function () {return false;},
        onUncheckAll: function () {return false;},
        onLoadSuccess: function (data) {return false;},
        onLoadError: function (status) {return false;}
    };

    BootstrapTable.COLUMN_DEFAULTS = {
        radio: false,
        checkbox: false,
        field: undefined,
        title: undefined,
        'class': undefined,
        align: undefined, // left, right, center
        valign: undefined, // top, middle, bottom
        width: undefined,
        sortable: false,
        order: 'asc', // asc, desc
        visible: true,
        switchable: true,
        formatter: undefined,
        events: undefined,
        sorter: undefined
    };

    BootstrapTable.EVENTS = {
        'all.bs.table': 'onAll',
        'click-row.bs.table': 'onClickRow',
        'dbl-click-row.bs.table': 'onDblClickRow',
        'sort.bs.table': 'onSort',
        'check.bs.table': 'onCheck',
        'uncheck.bs.table': 'onUncheck',
        'check-all.bs.table': 'onCheckAll',
        'uncheck-all.bs.table': 'onUncheckAll',
        'load-success.bs.table': 'onLoadSuccess',
        'load-error.bs.table': 'onLoadError'
    };

    BootstrapTable.prototype.init = function () {
        this.initContainer();
        this.initTable();
        this.initHeader();
        this.initData();
        this.initToolbar();
        this.initPagination();
        this.initBody();
        this.initServer();
    };

    BootstrapTable.prototype.initContainer = function () {
        this.jQuerycontainer = jQuery([
            '<div class="bootstrap-table">',
                '<div class="fixed-table-toolbar"></div>',
                '<div class="fixed-table-container">',
                    '<div class="fixed-table-header"><table></table></div>',
                    '<div class="fixed-table-body">',
                        '<div class="fixed-table-loading">',
                            this.options.formatLoadingMessage(),
                        '</div>',
                    '</div>',
                    '<div class="fixed-table-pagination"></div>',
                '</div>',
            '</div>'].join(''));

        this.jQuerycontainer.insertAfter(this.jQueryel);
        this.jQuerycontainer.find('.fixed-table-body').append(this.jQueryel);
        this.jQuerycontainer.after('<div class="clearfix"></div>');
        this.jQueryloading = this.jQuerycontainer.find('.fixed-table-loading');

        this.jQueryel.addClass(this.options.classes);
        if (this.options.striped) {
            this.jQueryel.addClass('table-striped');
        }
    };

    BootstrapTable.prototype.initTable = function () {
        var that = this,
            columns = [],
            data = [];

        this.jQueryheader = this.jQueryel.find('thead');
        if (!this.jQueryheader.length) {
            this.jQueryheader = jQuery('<thead></thead>').appendTo(this.jQueryel);
        }
        if (!this.jQueryheader.find('tr').length) {
            this.jQueryheader.append('<tr></tr>');
        }
        this.jQueryheader.find('th').each(function () {
            var column = jQuery.extend({}, {
                title: jQuery(this).html(),
                'class': jQuery(this).attr('class')
            }, jQuery(this).data());

            columns.push(column);
        });
        this.options.columns = jQuery.extend({}, columns, this.options.columns);
        jQuery.each(this.options.columns, function (i, column) {
            that.options.columns[i] = jQuery.extend({}, BootstrapTable.COLUMN_DEFAULTS, column);
        });

        // if options.data is setting, do not process tbody data
        if (this.options.data.length) {
            return;
        }

        this.jQueryel.find('tbody tr').each(function () {
            var row = {};
            jQuery(this).find('td').each(function (i) {
                row[that.options.columns[i].field] = jQuery(this).html();
            });
            data.push(row);
        });
        this.options.data = data;
    };

    BootstrapTable.prototype.initHeader = function () {
        var that = this,
            visibleColumns = [],
            html = [];

        this.header = {
            fields: [],
            styles: [],
            formatters: [],
            events: [],
            sorters: []
        };
        jQuery.each(this.options.columns, function (i, column) {
            var text = '',
                style = sprintf('text-align: %s; ', column.align) +
                        sprintf('vertical-align: %s; ', column.valign),
                order = that.options.sortOrder || column.order;

            if (!column.visible) {
                return;
            }

            visibleColumns.push(column);
            that.header.fields.push(column.field);
            that.header.styles.push(style);
            that.header.formatters.push(column.formatter);
            that.header.events.push(column.events);
            that.header.sorters.push(column.sorter);

            style += sprintf('width: %spx; ', column.checkbox || column.radio ? 36 : column.width);
            style += column.sortable ? 'cursor: pointer; ' : '';

            html.push('<th',
                column.checkbox || column.radio ? ' class="bs-checkbox"' :
                sprintf(' class="%s"', column['class']),
                sprintf(' style="%s"', style),
                '>');
            html.push('<div class="th-inner">');

            text = column.title;
            if (that.options.sortName === column.field && column.sortable) {
                text += that.getCaretHtml();
            }

            if (column.checkbox) {
                if (!that.options.singleSelect && that.options.checkboxHeader) {
                    text = '<input name="btSelectAll" type="checkbox" />';
                }
                that.header.stateField = column.field;
            }
            if (column.radio) {
                text = '';
                that.header.stateField = column.field;
                that.options.singleSelect = true;
            }

            html.push(text);
            html.push('</div>');
            html.push('<div class="fht-cell"></div>');
            html.push('</th>');
        });

        this.jQueryheader.find('tr').html(html.join(''));
        this.jQueryheader.find('th').each(function (i) {
            jQuery(this).data(visibleColumns[i]);

            if (visibleColumns[i].sortable) {
                jQuery(this).off('click').on('click', jQuery.proxy(that.onSort, that));
            }
        });

        if (!this.options.showHeader || this.options.cardView) {
            this.jQueryheader.hide();
            this.jQuerycontainer.find('.fixed-table-header').hide();
            this.jQueryloading.css('top', 0);
        } else {
            this.jQueryheader.show();
            this.jQuerycontainer.find('.fixed-table-header').show();
            this.jQueryloading.css('top', '42px');
        }

        this.jQueryselectAll = this.jQueryheader.find('[name="btSelectAll"]');
        this.jQueryselectAll.off('click').on('click', function () {
            var checked = jQuery(this).prop('checked');
            that[checked ? 'checkAll' : 'uncheckAll']();
        });
    };

    BootstrapTable.prototype.initData = function (data, append) {
        if (append) {
            this.data = this.data.concat(data);
        } else {
            this.data = data || this.options.data;
        }
        this.options.data = this.data;

        this.initSort();
    };

    BootstrapTable.prototype.initSort = function () {
        var name = this.options.sortName,
            order = this.options.sortOrder === 'desc' ? -1 : 1,
            index = jQuery.inArray(this.options.sortName, this.header.fields);

        if (index !== -1) {
            var sorter = this.header.sorters[index];
            this.data.sort(function (a, b) {
                if (typeof sorter === 'function') {
                    return order * sorter(a[name], b[name]);
                }
                if (typeof sorter === 'string') {
                    return order * eval(sorter + '(a[name], b[name])'); // eval ?
                }

                if (a[name] === b[name]) {
                    return 0;
                }
                if (a[name] < b[name]) {
                    return order * -1;
                }
                return order;
            });
        }
    };

    BootstrapTable.prototype.onSort = function (event) {
        var jQuerythis = jQuery(event.currentTarget),
            jQuerythis_ = this.jQueryheader.find('th').eq(jQuerythis.index());

        this.jQueryheader.add(this.jQueryheader_).find('span.order').remove();

        if (this.options.sortName === jQuerythis.data('field')) {
            this.options.sortOrder = this.options.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.options.sortName = jQuerythis.data('field');
            this.options.sortOrder = jQuerythis.data('order') === 'asc' ? 'desc' : 'asc';
        }
        this.trigger('sort', this.options.sortName, this.options.sortOrder);

        jQuerythis.add(jQuerythis_).data('order', this.options.sortOrder)
            .find('.th-inner').append(this.getCaretHtml());

        if (this.options.sidePagination === 'server') {
            this.initServer();
            return;
        }
        this.initSort();
        this.initBody();
    };

    BootstrapTable.prototype.initToolbar = function () {
        var that = this,
            html = [],
            timeoutId = 0,
            jQuerykeepOpen,
            jQuerysearch;

        this.jQuerytoolbar = this.jQuerycontainer.find('.fixed-table-toolbar').html('');

        if (typeof this.options.toolbar === 'string') {
            jQuery('<div class="bars pull-left"></div>')
                .appendTo(this.jQuerytoolbar)
                .append(jQuery(this.options.toolbar));
        }

        // showColumns, showToggle, showRefresh
        html = ['<div class="columns btn-group pull-right">'];

        if (this.options.showRefresh) {
            html.push('<button class="btn btn-default" type="button" name="refresh">',
                '<i class="glyphicon glyphicon-refresh icon-refresh"></i>',
                '</button>');
        }

        if (this.options.showToggle) {
            html.push('<button class="btn btn-default" type="button" name="toggle">',
                '<i class="glyphicon glyphicon glyphicon-list-alt icon-list-alt"></i>',
                '</button>');
        }

        if (this.options.showColumns) {
            html.push(sprintf('<div class="keep-open %s">',
                this.options.showRefresh || this.options.showToggle ? 'btn-group' : ''),
                '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown">',
                '<i class="glyphicon glyphicon-th icon-th"></i>',
                ' <span class="caret"></span>',
                '</button>',
                '<ul class="dropdown-menu" role="menu">');

            jQuery.each(this.options.columns, function (i, column) {
                if (column.radio || column.checkbox) {
                    return;
                }
                var checked = column.visible ? ' checked="checked"' : '';

                if (column.switchable) {
                    html.push(sprintf('<li>' +
                        '<label><input type="checkbox" value="%s"%s> %s</label>' +
                        '</li>', i, checked, column.title));
                }
            });
            html.push('</ul>',
                '</div>');
        }

        html.push('</div>');

        if (html.length > 2) {
            this.jQuerytoolbar.append(html.join(''));
        }

        if (this.options.showRefresh) {
            this.jQuerytoolbar.find('button[name="refresh"]')
                .off('click').on('click', jQuery.proxy(this.refresh, this));
        }

        if (this.options.showToggle) {
            this.jQuerytoolbar.find('button[name="toggle"]')
                .off('click').on('click', function () {
                    that.options.cardView = !that.options.cardView;
                    that.initHeader();
                    that.initBody();
                });
        }

        if (this.options.showColumns) {
            jQuerykeepOpen = this.jQuerytoolbar.find('.keep-open');
            jQuerykeepOpen.find('li').off('click').on('click', function (event) {
                event.stopImmediatePropagation();
            });
            jQuerykeepOpen.find('input').off('click').on('click', function () {
                var jQuerythis = jQuery(this),
                    jQueryitems = jQuerykeepOpen.find('input').prop('disabled', false);

                that.options.columns[jQuerythis.val()].visible = jQuerythis.prop('checked');
                that.initHeader();
                that.initBody();
                if (jQueryitems.filter(':checked').length <= that.options.minimumCountColumns) {
                    jQueryitems.filter(':checked').prop('disabled', true);
                }
            });
        }

        if (this.options.search) {
            html = [];
            html.push(
                '<div class="pull-right search">',
                    sprintf('<input class="form-control" type="text" placeholder="%s">',
                        this.options.formatSearch()),
                '</div>');

            this.jQuerytoolbar.append(html.join(''));
            jQuerysearch = this.jQuerytoolbar.find('.search input');
            jQuerysearch.off('keyup').on('keyup', function (event) {
                clearTimeout(timeoutId); // doesn't matter if it's 0
                timeoutId = setTimeout(jQuery.proxy(that.onSearch, that), 500, event); // 500ms
            });
        }
    };

    BootstrapTable.prototype.onSearch = function (event) {
        var that = this,
            text = jQuery.trim(jQuery(event.currentTarget).val());

        if (text === this.searchText) {
            return;
        }
        this.searchText = text;

        if (this.options.sidePagination !== 'server') {
            var s = that.searchText.toLowerCase();

            this.data = s ? jQuery.grep(this.options.data, function (item) {
                for (var key in item) {
                    if ((typeof item[key] === 'string' ||
                        typeof item[key] === 'number') &&
                        (item[key] + '').toLowerCase().indexOf(s) !== -1) {
                        return true;
                    }
                }
                return false;
            }) : this.options.data;
        }
        this.options.pageNumber = 1;
        this.updatePagination();
    };

    BootstrapTable.prototype.initPagination = function () {
        this.jQuerypagination = this.jQuerycontainer.find('.fixed-table-pagination');

        if (!this.options.pagination) {
            return;
        }
        var that = this,
            html = [],
            i, from, to,
            jQuerypageList,
            jQueryfirst, jQuerypre,
            jQuerynext, jQuerylast,
            jQuerynumber,
            data = this.searchText ? this.data : this.options.data;

        if (this.options.sidePagination !== 'server') {
            this.options.totalRows = data.length;
        }

        this.totalPages = 0;
        if (this.options.totalRows) {
            this.totalPages = ~~((this.options.totalRows - 1) / this.options.pageSize) + 1;
        }
        if (this.totalPages > 0 && this.options.pageNumber > this.totalPages) {
            this.options.pageNumber = this.totalPages;
        }

        this.pageFrom = (this.options.pageNumber - 1) * this.options.pageSize + 1;
        this.pageTo = this.options.pageNumber * this.options.pageSize;
        if (this.pageTo > this.options.totalRows) {
            this.pageTo = this.options.totalRows;
        }

        html.push(
            '<div class="pull-left pagination-detail">',
                '<span class="pagination-info">',
                    this.options.formatShowingRows(this.pageFrom, this.pageTo, this.options.totalRows),
                '</span>');

        html.push('<span class="page-list">');

        var pageNumber = [
            '<span class="btn-group dropup">',
            '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown">',
            '<span class="page-size">',
            this.options.pageSize,
            '</span>',
            ' <span class="caret"></span>',
            '</button>',
            '<ul class="dropdown-menu" role="menu">'],
            pageList = this.options.pageList;

        if (typeof this.options.pageList === 'string') {
            pageList = eval(this.options.pageList);
        }

        jQuery.each(pageList, function (i, page) {
            var active = page === that.options.pageSize ? ' class="active"' : '';
            pageNumber.push(sprintf('<li%s><a href="javascript:void(0)">%s</a></li>', active, page));
        });
        pageNumber.push('</ul></span>');

        html.push(this.options.formatRecordsPerPage(pageNumber.join('')));
        html.push('</span>');

        html.push('</div>',
            '<div class="pull-right pagination">',
                '<ul class="pagination">',
                    '<li class="page-first"><a href="javascript:void(0)">&lt;&lt;</a></li>',
                    '<li class="page-pre"><a href="javascript:void(0)">&lt;</a></li>');

        if (this.totalPages < 5) {
            from = 1;
            to = this.totalPages;
        } else {
            from = this.options.pageNumber - 2;
            to = from + 4;
            if (from < 1) {
                from = 1;
                to = 5;
            }
            if (to > this.totalPages) {
                to = this.totalPages;
                from = to - 4;
            }
        }
        for (i = from; i <= to; i++) {
            html.push('<li class="page-number' + (i === this.options.pageNumber ? ' active' : '') + '">',
                '<a href="javascript:void(0)">', i ,'</a>',
                '</li>');
        }

        html.push(
                    '<li class="page-next"><a href="javascript:void(0)">&gt;</a></li>',
                    '<li class="page-last"><a href="javascript:void(0)">&gt;&gt;</a></li>',
                '</ul>',
            '</div>');

        this.jQuerypagination.html(html.join(''));

        jQuerypageList = this.jQuerypagination.find('.page-list a');
        jQueryfirst = this.jQuerypagination.find('.page-first');
        jQuerypre = this.jQuerypagination.find('.page-pre');
        jQuerynext = this.jQuerypagination.find('.page-next');
        jQuerylast = this.jQuerypagination.find('.page-last');
        jQuerynumber = this.jQuerypagination.find('.page-number');

        if (this.options.pageNumber <= 1) {
            jQueryfirst.addClass('disabled');
            jQuerypre.addClass('disabled');
        }
        if (this.options.pageNumber >= this.totalPages) {
            jQuerynext.addClass('disabled');
            jQuerylast.addClass('disabled');
        }
        jQuerypageList.off('click').on('click', jQuery.proxy(this.onPageListChange, this));
        jQueryfirst.off('click').on('click', jQuery.proxy(this.onPageFirst, this));
        jQuerypre.off('click').on('click', jQuery.proxy(this.onPagePre, this));
        jQuerynext.off('click').on('click', jQuery.proxy(this.onPageNext, this));
        jQuerylast.off('click').on('click', jQuery.proxy(this.onPageLast, this));
        jQuerynumber.off('click').on('click', jQuery.proxy(this.onPageNumber, this));
    };

    BootstrapTable.prototype.updatePagination = function () {
        this.resetRows();
        this.initPagination();
        if (this.options.sidePagination === 'server') {
            this.initServer();
        } else {
            this.initBody();
        }
    };

    BootstrapTable.prototype.onPageListChange = function (event) {
        var jQuerythis = jQuery(event.currentTarget);

        jQuerythis.parent().addClass('active').siblings().removeClass('active');
        this.options.pageSize = +jQuerythis.text();
        this.jQuerytoolbar.find('.page-size').text(this.options.pageSize);
        this.updatePagination();
    };

    BootstrapTable.prototype.onPageFirst = function () {
        this.options.pageNumber = 1;
        this.updatePagination();
    };

    BootstrapTable.prototype.onPagePre = function () {
        this.options.pageNumber--;
        this.updatePagination();
    };

    BootstrapTable.prototype.onPageNext = function () {
        this.options.pageNumber++;
        this.updatePagination();
    };

    BootstrapTable.prototype.onPageLast = function () {
        this.options.pageNumber = this.totalPages;
        this.updatePagination();
    };

    BootstrapTable.prototype.onPageNumber = function (event) {
        if (this.options.pageNumber === +jQuery(event.currentTarget).text()) {
            return;
        }
        this.options.pageNumber = +jQuery(event.currentTarget).text();
        this.updatePagination();
    };

    BootstrapTable.prototype.initBody = function () {
        var that = this,
            html = [],
            data = this.searchText ? this.data : this.options.data;

        this.jQuerybody = this.jQueryel.find('tbody');
        if (!this.jQuerybody.length) {
            this.jQuerybody = jQuery('<tbody></tbody>').appendTo(this.jQueryel);
        }

        if (this.options.sidePagination === 'server') {
            data = this.data;
        }

        if (!this.options.pagination || this.options.sidePagination === 'server') {
            this.pageFrom = 1;
            this.pageTo = data.length;
        }

        for (var i = this.pageFrom - 1; i < this.pageTo; i++) {
            var item = data[i],
                style = {},
                csses = [];

            if (typeof this.options.rowStyle === 'function') {
                style = this.options.rowStyle(item, i);
            } else if (typeof this.options.rowStyle === 'string') {
                style = eval(this.options.rowStyle + '(item, i)');
            }

            if (style && style.css) {
                for (var key in style.css) {
                    csses.push(key + ': ' + style.css[key]);
                }
            }

            html.push('<tr',
                sprintf(' class="%s"', style.classes),
                sprintf(' data-index="%s"', i),
                '>'
            );

            if (this.options.cardView) {
                html.push(sprintf('<td colspan="%s">', this.header.fields.length));
            }

            jQuery.each(this.header.fields, function (j, field) {
                var text = '',
                    value = item[field],
                    type = '',
                    style = sprintf('style="%s"', csses.concat(that.header.styles[j]).join('; '));

                if (typeof that.header.formatters[j] === 'function') {
                    value = that.header.formatters[j](value, item, i);
                } else if (typeof that.header.formatters[j] === 'string') {
                    value = eval(that.header.formatters[j] + '(value, item, i)'); // eval ?
                }

                if (that.options.columns[j].checkbox || that.options.columns[j].radio) {
                    type = that.options.columns[j].checkbox ? 'checkbox' : type;
                    type = that.options.columns[j].radio ? 'radio' : type;

                    text = ['<td class="bs-checkbox">',
                        '<input' +
                            sprintf(' data-index="%s"', i) +
                            sprintf(' name="%s"', that.options.selectItemName) +
                            sprintf(' type="%s"', type) +
                            sprintf(' value="%s"', item[that.options.idField]) +
                            sprintf(' checked="%s"', value ? 'checked' : undefined) + ' />',
                        '</td>'].join('');
                } else {
                    value = typeof value === 'undefined' ? that.options.undefinedText : value;

                    text = that.options.cardView ?
                        ['<div class="card-view">',
                            sprintf('<span class="title" %s>%s</span>', style,
                                getPropertyFromOther(that.options.columns, 'field', 'title', field)),
                            sprintf('<span class="value">%s</span>', value),
                            '</div>'].join('') :
                        [sprintf('<td %s>', style),
                            value,
                            '</td>'].join('');
                }

                html.push(text);
            });

            if (this.options.cardView) {
                html.push('</td>');
            }

            html.push('</tr>');
        }

        // show no records
        if (!html.length) {
            html.push('<tr class="no-records-found">',
                sprintf('<td colspan="%s">%s</td>', this.header.fields.length, this.options.formatNoMatches()),
                '</tr>');
        }

        this.jQuerybody.html(html.join(''));

        this.jQuerycontainer.find('.fixed-table-body').scrollTop(0);

        this.jQuerybody.find('tr').off('click').on('click', function () {
            that.trigger('click-row', that.data[jQuery(this).data('index')], jQuery(this));
            if (that.options.clickToSelect) {
                jQuery(this).find(sprintf('[name="%s"]', that.options.selectItemName)).trigger('click');
            }
        });
        this.jQuerybody.find('tr').off('dblclick').on('dblclick', function () {
            that.trigger('dbl-click-row', that.data[jQuery(this).data('index')], jQuery(this));
        });

        this.jQueryselectItem = this.jQuerybody.find(sprintf('[name="%s"]', this.options.selectItemName));
        this.jQueryselectItem.off('click').on('click', function (event) {
            event.stopImmediatePropagation();
            var checkAll = that.jQueryselectItem.length === that.jQueryselectItem.filter(':checked').length,
                checked = jQuery(this).prop('checked') || jQuery(this).is(':radio'),
                row = that.data[jQuery(this).data('index')];

            that.jQueryselectAll.add(that.jQueryselectAll_).prop('checked', checkAll);
            row[that.header.stateField] = checked;
            that.trigger(checked ? 'check' : 'uncheck', row);

            if (that.options.singleSelect) {
                that.jQueryselectItem.not(this).each(function () {
                    that.data[jQuery(this).data('index')][that.header.stateField] = false;
                });
                that.jQueryselectItem.filter(':checked').not(this).prop('checked', false);
            }

//            jQuery(this).parents('tr')[checked ? 'addClass' : 'removeClass']('selected');
        });

        jQuery.each(this.header.events, function (i, events) {
            if (!events) {
                return;
            }
            if (typeof events === 'string') {
                events = eval(events);
            }
            for (var key in events) {
                that.jQuerybody.find('tr').each(function () {
                    var jQuerytr = jQuery(this),
                        jQuerytd = jQuerytr.find('td').eq(i),
                        index = key.indexOf(' '),
                        name = key.substring(0, index),
                        el = key.substring(index + 1),
                        func = events[key];

                    jQuerytd.find(el).off(name).on(name, function (e) {
                        var index = jQuerytr.data('index'),
                            row = that.data[index],
                            value = row[that.header.fields[i]];

                        func(e, value, row, index);
                    });
                });
            }
        });

        this.resetView();
    };

    BootstrapTable.prototype.initServer = function () {
        var that = this,
            data = {},
            params = {
                pageSize: this.options.pageSize,
                pageNumber: this.options.pageNumber,
                searchText: this.searchText,
                sortName: this.options.sortName,
                sortOrder: this.options.sortOrder
            };

        if (!this.options.url) {
            return;
        }
        this.jQueryloading.show();

        if (this.options.queryParamsType === 'limit') {
            params = {
                limit: params.pageSize,
                offset: params.pageSize * (params.pageNumber - 1),
                search: params.searchText,
                sort: params.sortName,
                order: params.sortOrder
            };
        }
        if (typeof this.options.queryParams === 'function') {
            data = this.options.queryParams(params);
        } else if (typeof this.options.queryParams === 'string') {
            data = eval(this.options.queryParams + '(params)');
        }

        jQuery.ajax({
            type: this.options.method,
            url: this.options.url,
            data: data,
            contentType: this.options.contentType,
            dataType: 'json',
            success: function (res) {
                if (typeof that.options.responseHandler === 'function') {
                    res = that.options.responseHandler(res);
                } else if (typeof that.options.responseHandler === 'string') {
                    res = eval(that.options.responseHandler + '(res)');
                }

                var data = res;

                if (that.options.sidePagination === 'server') {
                    that.options.totalRows = res.total;
                    data = res.rows;
                }
                that.load(data);
                that.trigger('load-success', data);
            },
            error: function (res) {
                that.trigger('load-error', res.status);
            },
            complete: function () {
                that.jQueryloading.hide();
            }
        });
    };

    BootstrapTable.prototype.getCaretHtml = function () {
        return ['<span class="order' + (this.options.sortOrder === 'desc' ? '' : ' dropup') + '">',
                '<span class="caret" style="margin: 10px 5px;"></span>',
            '</span>'].join('');
    };

    BootstrapTable.prototype.updateRows = function (checked) {
        var that = this;

        this.jQueryselectItem.each(function () {
            that.data[jQuery(this).data('index')][that.header.stateField] = checked;
        });
    };

    BootstrapTable.prototype.resetRows = function () {
        var that = this;

        jQuery.each(this.data, function (i, row) {
            that.jQueryselectAll.prop('checked', false);
            that.jQueryselectItem.prop('checked', false);
            row[that.header.stateField] = false;
        });
    };

    BootstrapTable.prototype.trigger = function (name) {
        var args = Array.prototype.slice.call(arguments, 1);

        name += '.bs.table';
        this.options[BootstrapTable.EVENTS[name]].apply(this.options, args);
        this.jQueryel.trigger(jQuery.Event(name), args);

        this.options.onAll(name, args);
        this.jQueryel.trigger(jQuery.Event('all.bs.table'), [name, args]);
    };

    BootstrapTable.prototype.resetHeader = function () {
        var that = this,
            jQueryfixedHeader = this.jQuerycontainer.find('.fixed-table-header'),
            jQueryfixedBody = this.jQuerycontainer.find('.fixed-table-body'),
            scrollWidth = this.jQueryel.width() > jQueryfixedBody.width() ? getScrollbarWidth() : 0;

        // fix #61: the hidden table reset header bug.
        if (this.jQueryel.is(':hidden')) {
            clearTimeout(this.timeoutId_); // doesn't matter if it's 0
            this.timeoutId_ = setTimeout(jQuery.proxy(this.resetHeader, this), 100); // 100ms
            return;
        }

        this.jQueryheader_ = this.jQueryheader.clone(true);
        this.jQueryselectAll_ = this.jQueryheader_.find('[name="btSelectAll"]');

        // fix bug: get jQueryel.css('width') error sometime (height = 500)
        setTimeout(function () {
            jQueryfixedHeader.css({
                'height': '37px',
                'border-bottom': '1px solid #dddddd',
                'margin-right': scrollWidth
            }).find('table').css('width', that.jQueryel.css('width'))
                .html('').attr('class', that.jQueryel.attr('class'))
                .append(that.jQueryheader_);

            that.jQueryel.css('margin-top', -that.jQueryheader.height());

            that.jQuerybody.find('tr:first-child:not(.no-records-found) > *').each(function(i) {
                that.jQueryheader_.find('div.fht-cell').eq(i).width(jQuery(this).innerWidth());
            });

            // horizontal scroll event
            jQueryfixedBody.off('scroll').on('scroll', function () {
                jQueryfixedHeader.scrollLeft(jQuery(this).scrollLeft());
            });
        });
    };

    // PUBLIC FUNCTION DEFINITION
    // =======================

    BootstrapTable.prototype.resetView = function (params) {
        var that = this,
            header = this.header;

        if (params && params.height) {
            this.options.height = params.height;
        }

        this.jQueryselectAll.prop('checked', this.jQueryselectItem.length > 0 &&
            this.jQueryselectItem.length === this.jQueryselectItem.filter(':checked').length);

        if (this.options.height) {
            var toolbarHeight = +this.jQuerytoolbar.children().outerHeight(true),
                paginationHeight = +this.jQuerypagination.children().outerHeight(true),
                height = this.options.height - toolbarHeight - paginationHeight;

            this.jQuerycontainer.find('.fixed-table-container').css('height', height + 'px');
        }

        if (this.options.cardView) {
            // remove the element css
            that.jQueryel.css('margin-top', '0');
            that.jQuerycontainer.find('.fixed-table-container').css('padding-bottom', '0');
            return;
        }

        if (this.options.showHeader && this.options.height) {
            this.resetHeader();
        }

        if (this.options.height && this.options.showHeader) {
            this.jQuerycontainer.find('.fixed-table-container').css('padding-bottom', '37px');
        }
    };

    BootstrapTable.prototype.load = function (data) {
        this.initData(data);
        this.initPagination();
        this.initBody();
    };

    BootstrapTable.prototype.append = function (data) {
        this.initData(data, true);
        this.initBody();
    };

    BootstrapTable.prototype.mergeCells = function (options) {
        var row = options.index,
            col = jQuery.inArray(options.field, this.header.fields),
            rowspan = options.rowspan || 1,
            colspan = options.colspan || 1,
            i, j,
            jQuerytr = this.jQuerybody.find('tr'),
            jQuerytd = jQuerytr.eq(row).find('td').eq(col);

        if (row < 0 || col < 0 || row >= this.data.length) {
            return;
        }

        for (i = row; i < row + rowspan; i++) {
            for (j = col; j < col + colspan; j++) {
                jQuerytr.eq(i).find('td').eq(j).hide();
            }
        }

        jQuerytd.attr('rowspan', rowspan).attr('colspan', colspan).show();
    };

    BootstrapTable.prototype.getSelections = function () {
        var that = this;

        return jQuery.grep(this.data, function (row) {
            return row[that.header.stateField];
        });
    };

    BootstrapTable.prototype.checkAll = function () {
        this.jQueryselectAll.add(this.jQueryselectAll_).prop('checked', true);
        this.jQueryselectItem.prop('checked', true);
        this.updateRows(true);
        this.trigger('check-all');
    };

    BootstrapTable.prototype.uncheckAll = function () {
        this.jQueryselectAll.add(this.jQueryselectAll_).prop('checked', false);
        this.jQueryselectItem.prop('checked', false);
        this.updateRows(false);
        this.trigger('uncheck-all');
    };

    BootstrapTable.prototype.destroy = function () {
        this.jQueryel.insertBefore(this.jQuerycontainer);
        jQuery(this.options.toolbar).insertBefore(this.jQueryel);
        this.jQuerycontainer.next().remove();
        this.jQuerycontainer.remove();
        this.jQueryel.html(this.jQueryel_.html())
            .attr('class', this.jQueryel_.attr('class') || ''); // reset the class
    };

    BootstrapTable.prototype.showLoading = function () {
        this.jQueryloading.show();
    };

    BootstrapTable.prototype.hideLoading = function () {
        this.jQueryloading.hide();
    };

    BootstrapTable.prototype.refresh = function () {
        this.initServer();
    };


    // BOOTSTRAP TABLE PLUGIN DEFINITION
    // =======================

    jQuery.fn.bootstrapTable = function (option, _relatedTarget) {
        var allowedMethods = [
                'getSelections',
                'load', 'append', 'mergeCells',
                'checkAll', 'uncheckAll',
                'destroy', 'resetView',
                'showLoading', 'hideLoading',
                'refresh'
            ],
            value;

        this.each(function () {
            var jQuerythis = jQuery(this),
                data = jQuerythis.data('bootstrap.table'),
                options = jQuery.extend({}, BootstrapTable.DEFAULTS, jQuerythis.data(),
                    typeof option === 'object' && option);

            if (typeof option === 'string') {
                if (jQuery.inArray(option, allowedMethods) < 0) {
                    throw "Unknown method: " + option;
                }

                if (!data) {
                    return;
                }

                value = data[option](_relatedTarget);

                if (option === 'destroy') {
                    jQuerythis.removeData('bootstrap.table');
                }
            }

            if (!data) {
                jQuerythis.data('bootstrap.table', (data = new BootstrapTable(this, options)));
            }
        });

        return typeof value === 'undefined' ? this : value;
    };

    jQuery.fn.bootstrapTable.Constructor = BootstrapTable;
    jQuery.fn.bootstrapTable.defaults = BootstrapTable.DEFAULTS;
    jQuery.fn.bootstrapTable.columnDefaults = BootstrapTable.COLUMN_DEFAULTS;

    // BOOTSTRAP TABLE INIT
    // =======================

    jQuery(function () {
        jQuery('[data-toggle="table"]').bootstrapTable();
    });

}(jQuery);

});