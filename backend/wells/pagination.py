from rest_framework.pagination import PageNumberPagination


class FlexiblePageNumberPagination(PageNumberPagination):
    """Пагинация с возможностью задать размер страницы: ?page_size=N (не более 1000)."""

    page_size_query_param = 'page_size'
    max_page_size = 1000
