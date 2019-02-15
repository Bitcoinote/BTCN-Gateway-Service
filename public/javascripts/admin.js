/* eslint-env browser, jquery */
/* global bootbox */

$(function () {
  $('#transactions-table').DataTable({
    order: [[1, 'desc']]
  })
  $('#transactions-table').on('click', '.info-btn', function () {
    var $this = $(this)
    bootbox.alert({
      message: '<textarea class="form-control" style="height: 60vh;" readonly>' + $('<i/>').text(JSON.stringify(JSON.parse($this.closest('tr').attr('data-json')), null, 4)).html() + '</textarea>',
      size: 'large'
    })
  })
  $('#transactions-table').on('click', '.cancel-btn', function () {
    var $this = $(this)
    bootbox.confirm('Are you sure you want to cancel this transaction? Future payments for this transaction will have no effect!', function (result) {
      if (result) {
        $.post('/api/transactions/' + $this.closest('tr').attr('data-id') + '/cancel').done(function () {
          location.reload()
        }).fail(function () {
          bootbox.alert('Operation failed!')
        })
      }
    })
  })
  $('#transactions-table').on('click', '.delete-btn', function () {
    var $this = $(this)
    bootbox.confirm('Are you sure you want to DELETE this transaction?', function (result) {
      if (result) {
        $.post('/api/transactions/' + $this.closest('tr').attr('data-id'), { _method: 'DELETE' }).done(function () {
          location.reload()
        }).fail(function () {
          bootbox.alert('Operation failed!')
        })
      }
    })
  })
})
