package lru_test

import (
	"testing"
)

func TestSegfault(t *testing.T) {
	var p *int
	t.Log("B:", *p)
}
