const {
    ipcRenderer,
    remote
} = eRequire('electron');
const os = eRequire('os');
const fse = eRequire('fs-extra');
const _ = eRequire("lodash");
const moment = eRequire('moment');
const sqlDb = eRequire("mssql");

const storage = eRequire('electron-json-storage');

const dbOrigin = eRequire('./dbOrigin');
const dbDest = eRequire('./dbDest');

$(function () {
    $(document).ready(function () {
        // Access the DOM elements here...

        // console.log(os.tmpdir());

        let destPath = os.tmpdir() + '\\tabelas';
        fse.mkdirsSync(destPath);
        // console.log(destPath);
        storage.setDataPath(destPath);

        NProgress.configure({
            minimum: 0.1,
            trickleSpeed: 200
        });

        $('#btnGetAllProducts').click(function (e) {

            let $btn = this;

            NProgress.start();

            $('#divTiming').append(`<li>Conectado ao servidor de origem ${(new Date()).toLocaleTimeString()}.</li>`);

            let sqlGet = 'set language portuguese; ';
            // let tableList = 'categoria,colecao,custoproduto,entrada,entradaitens,grades,grupo,gruposubgrupo,itens_grade,itens_grade_estoque,parametros_produto,produto,produtofornecedor,subgrupo,';
            let tableList = 'categoria,colecao,custoproduto,entrada,entradaitens,';
            let tables = tableList.replace(/,\s*$/, "").split(',');

            let counter = tables.length,
                lineCount = 0;

            _.forEach(tables, function (item, index) {
                // if (item === 'produto') {
                //     sqlGet += `select top 100 * into #temp from ${item}; alter table #temp drop column foto; select * from #temp; drop table #temp; `
                // } else {'
                sqlGet += `select * from view_${item}_sinc; `
                // }

                dbOrigin.stream = true;
                dbOrigin.request().query(sqlGet, (errOrigin, data) => {
                    if (errOrigin) {
                        console.log(errOrigin);

                        NProgress.done();
                    } else {

                        // _.forEach(tables, function (item, index) {
                        //     if (data.recordsets[index].length) {
                        //         storage.set(item, data.recordsets[index], function (error) {
                        //             if (error) throw error;
                        //         });

                        //         _.forEach(data.recordsets[index].columns, function (column) {
                        //             console.log(column.name);
                        //         });
                        //     }
                        // });  

                        let sqlInst = `set language portuguese; waitfor delay \'00:00:05\'; `;

                        // sqlInst += `exec sp_msforeachtable 'alter table ? disable trigger all'; `
                        // sqlInst += `exec sp_desabilitar_chaves; `;
                        sqlInst += `alter table ${item} disable trigger all; `;
                        sqlInst += `alter table ${item} nocheck constraint all; `;
                        sqlInst += `delete from ${item}; `;
                        sqlInst += `set identity_insert ${item} on; `;

                        lineCount++;
                        sqlInst += `declare @list_${item + index.toString()} varchar(max); `;
                        sqlInst += `set @list_${item + index.toString()} = `;

                        let sqlSel = `'`;
                        _.forEach(data.recordsets[index], function (itens, i) {

                            sqlSel += `select `;
                            let sqlSelIn = '';
                            _.forEach(data.recordsets[index][i], function (value) {
                                if (value == null) {
                                    sqlSelIn += `${null}, `;
                                } else if (value instanceof Date) {
                                    sqlSelIn += `''${moment(value).format('DD/MM/YYYY HH:mm')}'', `;
                                } else if (isNaN(value)) {
                                    sqlSelIn += `''${value}'', `;
                                } else if (value == true) {
                                    sqlSelIn += `1, `;
                                } else if (value == false) {
                                    sqlSelIn += `0, `;
                                } else {
                                    if (value.length > 10) {
                                        sqlSelIn += `''${value}'', `;
                                    } else {
                                        sqlSelIn += `${value}, `;
                                    }
                                }
                            });
                            sqlSel += sqlSelIn.replace(/,\s*$/, " ");

                        });

                        sqlInst += `${sqlSel}'; insert into ${item} (`;

                        let columns = '';
                        _.forEach(data.recordsets[index].columns, function (column) {
                            columns += column.name + ',';
                        });

                        sqlInst += `${columns.replace(/,\s*$/, "")}) exec(@list_${item + index.toString()}); `;

                        sqlInst += `set identity_insert ${item} off; `;
                        sqlInst += `alter table ${item} nocheck constraint all; `;
                        sqlInst += `alter table ${item} enable trigger all; `;
                        // sqlInst += `exec sp_habilitar_chaves; `;
                        // sqlInst += `exec sp_msforeachtable 'alter table ? enable trigger all'; `

                        dbDest.stream = true;
                        dbDest.request().query(sqlInst, (errDest, result) => {
                            if (errDest) {
                                console.log(errDest);

                                NProgress.done();
                            } else {
                                $('#divTiming').append(`<li>Importando...</li>`);
                                console.log(result);
                                $('#divTiming').append(`<li>Tabela ${item} - ${(new Date()).toLocaleTimeString()}.</li>`);
                                counter = counter - 1;

                                if (counter == 0) {
                                    $('#divTiming').append(`<li>Fim ${(new Date()).toLocaleTimeString()}.</li>`);

                                    NProgress.done();
                                }
                            }
                        });
                    }
                });
            });
        });
    });
});